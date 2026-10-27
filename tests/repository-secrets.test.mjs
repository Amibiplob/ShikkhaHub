import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanGitIndex } from '../scripts/check-repository-secrets.mjs';

const ignore = readFileSync(new URL('../.gitignore', import.meta.url));
function repository(run) {
  const cwd = mkdtempSync(join(tmpdir(), 'shikkhahub-security-'));
  const git = (...args) => execFileSync('git', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  const file = (path, text) => { mkdirSync(dirname(join(cwd, path)), { recursive: true }); writeFileSync(join(cwd, path), text); };
  try {
    git('init', '-q');
    file('.gitignore', ignore);
    run({ cwd, git, file });
  } finally { rmSync(cwd, { recursive: true, force: true }); }
}

test('private local files stay ignored while nested examples and samples can be committed', () => repository(({ cwd, git, file }) => {
  for (const path of ['.env', '.env.local', 'supabase/functions/.env.staging', 'staging-accounts.env', 'artifacts/staging/accounts.json', 'playwright/.auth/user.json', 'auth-state-local.json', 'local.secrets', 'server.key']) {
    file(path, 'synthetic-test-only');
    assert.equal(git('check-ignore', '--no-index', path).toString().trim(), path);
  }
  for (const path of ['.env.example', '.env.sample', 'supabase/functions/.env.example', 'nested/.env.sample']) {
    file(path, 'PUBLIC_SETTING=PLACEHOLDER'); git('add', '--', path);
  }
  assert.deepEqual(scanGitIndex(cwd), []);
}));

test('force-adding an ignored environment or credential artifact fails closed', () => repository(({ cwd, git, file }) => {
  for (const path of ['.env', 'staging-accounts.env', 'artifacts/staging/accounts.json']) {
    file(path, 'synthetic-test-only'); git('add', '-f', '--', path);
  }
  assert.equal(scanGitIndex(cwd).filter((issue) => issue.reason.includes('path')).length, 3);
}));

test('untracking an environment preserves local bytes and removes the finding', () => repository(({ cwd, git, file }) => {
  const value = 'LOCAL_SETTING=synthetic-test-only\n';
  file('.env', value); git('add', '-f', '--', '.env');
  git('-c', 'user.name=Test Fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture');
  git('rm', '--cached', '--', '.env');
  assert.equal(readFileSync(join(cwd, '.env'), 'utf8'), value);
  assert.deepEqual(scanGitIndex(cwd), []);
}));

test('inspects the staged blob rather than the unstaged working copy', () => repository(({ cwd, git, file }) => {
  const synthetic = ['sb', 'secret', 'unknown-placeholder-' + 'a'.repeat(32)].join('_');
  file('config.txt', synthetic); git('add', '--', 'config.txt'); file('config.txt', 'PLACEHOLDER');
  const issues = scanGitIndex(cwd);
  assert.equal(issues[0].reason, 'Supabase secret key');
  assert.ok(!JSON.stringify(issues).includes(synthetic));
  const cli = fileURLToPath(new URL('../scripts/check-repository-secrets.mjs', import.meta.url));
  assert.throws(() => execFileSync(process.execPath, [cli], { cwd, stdio: 'pipe' }), (error) => {
    assert.equal(error.status, 1);
    assert.ok(!error.stderr.toString().includes(synthetic));
    return true;
  });
}));

test('rejects privileged JWTs, session JWTs and private keys without logging values', () => repository(({ cwd, git, file }) => {
  const jwt = (payload) => `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.synthetic`;
  // Real JWT headers start with eyJ; construct only synthetic matching headers.
  const header = Buffer.from('{"alg":"HS256"}').toString('base64url');
  file('service.txt', jwt({ role: 'service_role' }).replace(/^[^.]+/, header));
  file('session.txt', jwt({ role: 'authenticated', sub: 'synthetic-user' }).replace(/^[^.]+/, header));
  file('key.txt', ['-----BEGIN ', 'PRIVATE KEY-----'].join(''));
  git('add', '--', 'service.txt', 'session.txt', 'key.txt');
  assert.equal(scanGitIndex(cwd).length, 3);
}));

test('public keys and explicit negative-test placeholders are permitted', () => repository(({ cwd, git, file }) => {
  const header = Buffer.from('{"alg":"HS256"}').toString('base64url');
  const payload = Buffer.from('{"role":"anon"}').toString('base64url');
  file('fixture.txt', `${header}.${payload}.synthetic\nsb_publishable_test-placeholder\nsb_secret_external-placeholder`);
  git('add', '--', 'fixture.txt');
  assert.deepEqual(scanGitIndex(cwd), []);
}));
