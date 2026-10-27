// Build the actual application in a disposable root with synthetic process settings.
// Sources/dependencies are linked; the disposable build root has no .env files.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const metadata = {
  VITE_VERCEL_ENV: 'preview',
  VITE_VERCEL_TARGET_ENV: 'preview',
  VITE_VERCEL_URL: 'shikkhahub-preview.example.test',
  VITE_VERCEL_BRANCH_URL: 'shikkhahub-git-fix.example.test',
  VITE_VERCEL_PROJECT_PRODUCTION_URL: 'shikkhahub.example.test',
  VITE_VERCEL_HASH_SALT: '1783933175',
  VITE_VERCEL_GIT_PROVIDER: 'github',
  VITE_VERCEL_GIT_REPO_SLUG: 'ShikkhaHub',
  VITE_VERCEL_GIT_REPO_OWNER: 'example-owner',
  VITE_VERCEL_GIT_REPO_ID: '123456789',
  VITE_VERCEL_GIT_COMMIT_REF: 'build-regression',
  VITE_VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VITE_VERCEL_GIT_COMMIT_MESSAGE: 'Synthetic build regression',
  VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'example-author',
  VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME: 'Example Author',
  VITE_VERCEL_GIT_PULL_REQUEST_ID: '',
};

test('real Vite build accepts Vercel metadata/anon alias and still rejects secrets', { timeout: 120_000 }, () => {
  const root = mkdtempSync(join(tmpdir(), 'shikkhahub-vercel-build-'));
  try {
    mkdirSync(join(root, 'config'));
    for (const file of ['package.json', 'index.html', '.gitignore', 'vite.config.ts', 'tailwind.config.ts', 'config/public-environment.ts'])
      copyFileSync(join(repository, file), join(root, file));
    for (const directory of ['src', 'public', 'node_modules'])
      symlinkSync(join(repository, directory), join(root, directory), 'dir');
    const env = {
      ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_'))),
      ...metadata,
      VITE_SUPABASE_URL: 'https://disposable.example.test',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_vercel-build-placeholder',
    };
    const build = (extra = {}) => spawnSync('npm', ['run', 'build', '--', '--minify', 'false'], {
      cwd: root, env: { ...env, ...extra }, encoding: 'utf8', timeout: 60_000,
    });
    const success = build();
    assert.equal(success.status, 0, success.stdout + success.stderr);
    const assets = join(root, 'dist', 'assets');
    const scripts = readdirSync(assets).filter((name) => name.endsWith('.js')).map((name) => readFileSync(join(assets, name), 'utf8'));
    assert.ok(scripts.some((text) => text.includes(env.VITE_SUPABASE_URL) && text.includes(env.VITE_SUPABASE_ANON_KEY)), 'SDK client receives the alias value');
    assert.equal(scripts.filter((text) => /apikey:\s*["']sb_publishable_vercel-build-placeholder["']/.test(text)).length, 2, 'assistant and support HTTP headers receive the same public alias');
    assert.ok(readdirSync(assets).some((name) => name.endsWith('.css')), 'application styles are built');

    for (const name of ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SECRET_KEY', 'VITE_DATABASE_URL', 'VITE_POSTGRES_PASSWORD', 'VITE_VERCEL_OIDC_TOKEN', 'VITE_VERCEL_GIT_TOKEN']) {
      const rejected = build({ [name]: 'synthetic-private-value-never-log' });
      assert.notEqual(rejected.status, 0, name);
      assert.ok((rejected.stdout + rejected.stderr).includes(`Unsupported browser variable ${name}`));
      assert.ok(!(rejected.stdout + rejected.stderr).includes('synthetic-private-value-never-log'));
    }
    const privileged = build({ VITE_SUPABASE_ANON_KEY: ['sb', 'secret', 'synthetic-test-placeholder'].join('_') });
    assert.notEqual(privileged.status, 0);
    assert.ok((privileged.stdout + privileged.stderr).includes('public publishable/anon key'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
