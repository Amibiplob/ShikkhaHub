// Actual application builds and Vite transforms; synthetic settings, no .env copies.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, symlinkSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createServer } from 'vite';

const repository = fileURLToPath(new URL('../', import.meta.url));
const markers = ['OBSERVABILITY_PRIVATE_MARKER_9271', 'FUTURE_PROVIDER_MARKER_3842', 'UNKNOWN_PRIVATE_MARKER_7193', 'SERVER_ONLY_MARKER_8214', 'UNUSED_PROJECT_MARKER_6248'];
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
  VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: JSON.stringify({ analytics: { scriptSrc: '/synthetic/script.js', eventEndpoint: '/synthetic/events', marker: markers[0] } }),
  VITE_FUTURE_PROVIDER_CONFIG: markers[1],
  VITE_UNKNOWN_PAYLOAD: ['sb', 'secret', markers[2]].join('_'),
  INTERNAL_SERVER_CONFIGURATION: markers[3],
  VITE_SUPABASE_PROJECT_ID: markers[4],
};
const settings = {
  ...metadata,
  VITE_SUPABASE_URL: 'https://disposable.example.test',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_vercel-build-placeholder',
};
const probe = `globalThis.__environmentProbe = {
  env: import.meta.env,
  spread: { ...import.meta.env },
  dot: import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG,
  computed: import.meta.env[globalThis.__lookup || 'VITE_UNKNOWN_PAYLOAD'],
  alias: import.meta.env.VITE_SUPABASE_ANON_KEY,
  server: import.meta.env.INTERNAL_SERVER_CONFIGURATION,
};`;
const probeHtml = '<html><head><meta name="provider" content="%VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG%"></head><body><script type="module" src="/environment-probe.js"></script></body></html>';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'shikkhahub-vercel-build-'));
  mkdirSync(join(root, 'config'));
  for (const file of ['package.json', 'index.html', '.gitignore', 'vite.config.ts', 'tailwind.config.ts', 'config/public-environment.ts'])
    copyFileSync(join(repository, file), join(root, file));
  for (const directory of ['src', 'public', 'node_modules'])
    symlinkSync(join(repository, directory), join(root, directory), 'dir');
  return root;
}
function build(root, configured = settings) {
  return spawnSync('npm', ['run', 'build', '--', '--minify', 'false'], {
    cwd: root,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_'))), ...configured },
    encoding: 'utf8', timeout: 60_000,
  });
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}
function noMarkers(content) {
  for (const marker of markers) assert.ok(!content.includes(marker), 'Unused environment data leaked');
}
function inspectAssets(root) {
  for (const path of files(join(root, 'dist'))) noMarkers(readFileSync(path).toString('utf8'));
}
function evaluateProbe(code) {
  // The preload polyfill needs only this DOM capability. The probe is otherwise
  // plain emitted JS. For dev, rebind import.meta.env so a script VM can execute
  // Vite's actual injected environment object and the same dynamic lookups.
  const context = { document: { createElement: () => ({ relList: { supports: () => true } }) } };
  runInNewContext(code.replaceAll('import.meta.env', 'globalThis.__viteEnvironment'), context);
  return JSON.parse(JSON.stringify(context.__environmentProbe));
}
function assertEnvironment(result, url, key) {
  const publicNames = ['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_URL'];
  assert.deepEqual(Object.keys(result.env).filter((name) => name.startsWith('VITE_')).sort(), publicNames);
  assert.equal(result.env.VITE_SUPABASE_URL, url);
  assert.equal(result.env.VITE_SUPABASE_PUBLISHABLE_KEY, key);
  assert.deepEqual(result.spread, result.env);
  for (const name of ['dot', 'computed', 'alias', 'server']) assert.equal(result[name], undefined);
  noMarkers(JSON.stringify(result));
}

test('real production app and development/production env probes expose only validated application settings', { timeout: 120_000 }, async () => {
  const root = fixture();
  const originalDirectory = process.cwd();
  const changedNames = new Set([...Object.keys(process.env).filter((name) => name.startsWith('VITE_')), ...Object.keys(settings), 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_USER_NODE_ENV', 'NODE_ENV']);
  const originalEnvironment = Object.fromEntries([...changedNames].map((name) => [name, process.env[name]]));
  let server;
  try {
    const success = build(root);
    assert.equal(success.status, 0, success.stdout + success.stderr);
    const scripts = files(join(root, 'dist')).filter((name) => name.endsWith('.js')).map((name) => readFileSync(name, 'utf8'));
    assert.ok(scripts.some((text) => text.includes(settings.VITE_SUPABASE_URL) && text.includes(settings.VITE_SUPABASE_ANON_KEY)), 'SDK client receives the alias');
    assert.equal(scripts.filter((text) => /apikey:\s*["']sb_publishable_vercel-build-placeholder["']/.test(text)).length, 2, 'both Edge HTTP callers receive the alias');
    inspectAssets(root);

    // Force whole-object, spread, computed and direct access. Unused values would
    // otherwise be tree-shaken even with a broken exposure policy.
    writeFileSync(join(root, 'index.html'), probeHtml);
    writeFileSync(join(root, 'environment-probe.js'), probe);
    const production = build(root);
    assert.equal(production.status, 0, production.stdout + production.stderr);
    inspectAssets(root);
    const emitted = files(join(root, 'dist')).filter((name) => name.endsWith('.js')).map((name) => readFileSync(name, 'utf8')).join('\n');
    assertEnvironment(evaluateProbe(emitted), settings.VITE_SUPABASE_URL, settings.VITE_SUPABASE_ANON_KEY);
    assert.ok(readFileSync(join(root, 'dist', 'index.html'), 'utf8').includes('%VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG%'), 'HTML does not interpolate provider data');

    // Run the real dev transformer with standard loopback settings in this same
    // disposable root. Restore all changed process settings and cwd afterward.
    for (const name of changedNames) delete process.env[name];
    Object.assign(process.env, settings, { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'isolated-e2e-public-key' });
    process.chdir(root);
    server = await createServer({
      optimizeDeps: { noDiscovery: true, include: [] },
      server: { middlewareMode: true, hmr: false, watch: null },
    });
    const transformed = await server.transformRequest('/environment-probe.js');
    assert.ok(transformed);
    noMarkers(transformed.code);
    assertEnvironment(evaluateProbe(transformed.code), 'http://127.0.0.1:54321', 'isolated-e2e-public-key');
    noMarkers(await server.transformIndexHtml('/', probeHtml));
  } finally {
    await server?.close();
    process.chdir(originalDirectory);
    for (const name of changedNames) {
      if (originalEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
    rmSync(root, { recursive: true, force: true });
  }
});

test('credential names, privileged frontend keys and invalid/missing application settings fail before emission', { timeout: 120_000 }, () => {
  const root = fixture();
  try {
    for (const name of ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SECRET_KEY', 'VITE_DATABASE_URL', 'VITE_POSTGRES_PASSWORD', 'VITE_JWT_SECRET', 'VITE_ARBITRARY_API_KEY', 'VITE_VERCEL_OIDC_TOKEN', 'VITE_VERCEL_GIT_TOKEN']) {
      const rejected = build(root, { ...settings, [name]: 'synthetic-private-value-never-log' });
      assert.notEqual(rejected.status, 0, name);
      assert.ok((rejected.stdout + rejected.stderr).includes(`Sensitive browser variable ${name}`));
      assert.ok(!(rejected.stdout + rejected.stderr).includes('synthetic-private-value-never-log'));
    }
    for (const extra of [
      { VITE_SUPABASE_ANON_KEY: ['sb', 'secret', 'synthetic-test-placeholder'].join('_') },
      { VITE_SUPABASE_PUBLISHABLE_KEY: ['sb', 'secret', 'synthetic-test-placeholder'].join('_') },
      { VITE_SUPABASE_ANON_KEY: `x.${Buffer.from('{"role":"service_role"}').toString('base64url')}.x` },
      { VITE_SUPABASE_URL: 'invalid-url-synthetic-marker' },
      { VITE_SUPABASE_URL: '' },
      { VITE_SUPABASE_ANON_KEY: '' },
    ]) {
      const rejected = build(root, { ...settings, ...extra });
      assert.notEqual(rejected.status, 0);
      assert.ok(!(rejected.stdout + rejected.stderr).includes(Object.values(extra)[0] || 'no-empty-marker'));
    }
    assert.equal(files(root).some((path) => path.startsWith(join(root, 'dist'))), false, 'rejections emit no assets');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('SPA fallback covers nested client routes while reserving API and asset requests', () => {
  const config = JSON.parse(readFileSync(join(repository, 'vercel.json'), 'utf8'));
  const fallback = config.rewrites.find(route => route.destination === '/index.html');
  assert.ok(fallback);
  const source = new RegExp(`^${fallback.source}$`);
  for (const path of ['/', '/courses/10000000-0000-4000-8000-000000000001', '/certificates/verify/token', '/dashboard', '/admin', '/reset-password', '/unknown-route'])
    assert.ok(source.test(path), path);
  for (const path of ['/api', '/api/example', '/assets/missing.js', '/assets', '/favicon.svg', '/robots.txt', '/images/missing.png'])
    assert.ok(!source.test(path), path);
});
