import { defineConfig } from '@playwright/test';
import { stagingSettings } from './e2e/staging/settings';

const settings = stagingSettings();
export default defineConfig({
  testDir: './e2e/staging',
  testMatch: '**/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  outputDir: 'artifacts/staging-results',
  reporter: [['list'], ['json', { outputFile: 'artifacts/staging-results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:18081',
    launchOptions: { channel: process.env.E2E_BROWSER_CHANNEL || 'chrome' },
    // Real credentials/tokens must never enter traces, video or screenshots.
    trace: 'off', screenshot: 'off', video: 'off',
  },
  webServer: settings ? {
    command: 'npm run dev -- --host 127.0.0.1 --port 18081 --strictPort --mode staging-acceptance',
    url: 'http://127.0.0.1:18081',
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: settings.url, VITE_SUPABASE_PUBLISHABLE_KEY: settings.key },
  } : undefined,
});
