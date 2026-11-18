import { defineConfig } from '@playwright/test';

import { mockPort, mockOrigin } from './e2e/target';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/staging/**',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: mockOrigin,
    viewport: { width: 1440, height: 1000 },
    launchOptions: { channel: process.env.E2E_BROWSER_CHANNEL || 'chrome' },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Serve an isolated release bundle: development HMR (including Markdown
    // updates) must not reset forms or live meetings during a browser journey.
    command: `npm run build -- --mode e2e --outDir artifacts/e2e-app && npm run preview -- --host 127.0.0.1 --port ${mockPort} --strictPort --mode e2e --outDir artifacts/e2e-app`,
    url: mockOrigin,
    reuseExistingServer: false,
    env: {
      // Explicit test-only endpoint: the browser fixture fulfills every request.
      VITE_AI_ASSISTANT_ENABLED: 'true',
      VITE_LIVE_TURN_ENABLED: 'false',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'isolated-e2e-public-key',
    },
  },
});
