// playwright.config.js - Config for the smoke test suite.
//
// Reads SHAREBLY_URL and SHAREBLY_TEST_EMAIL/PASSWORD from env (.env loaded
// before invocation, e.g. `set -a && source .env && set +a && npm run smoke`).
//
// Auth state is read from output/auth-state.json. Run
// `npm run verify:browser` once to log in and populate it; the smoke tests
// then reuse that session.

import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE = path.join(__dirname, 'output', 'auth-state.json');

export default defineConfig({
  testDir: './smoke',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'output/playwright-report', open: 'never' }],
    ['json', { outputFile: 'output/playwright-results.json' }],
  ],
  use: {
    baseURL: process.env.SHAREBLY_URL || 'http://78.46.183.126:5173',
    storageState: AUTH_STATE,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
