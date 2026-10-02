import { defineConfig, devices } from '@playwright/test';

const TEST_PORT = process.env.TEST_PORT || '3100';
const TEST_DB_PATH = process.env.DATABASE_PATH || './data/test-e2e.db';

// Guard: Refuse to run tests against primary development database (R10)
const normalizedPath = TEST_DB_PATH.replace(/\\/g, '/');
if (normalizedPath.endsWith('/council.db') || normalizedPath === './data/council.db' || normalizedPath === 'data/council.db') {
  throw new Error(`[R10 Guard Violation] Refusing to run tests against primary development database (${TEST_DB_PATH}). Must use isolated test database.`);
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${TEST_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], colorScheme: 'dark' },
    },
  ],
  webServer: {
    command: `npx next start -p ${TEST_PORT}`,
    url: `http://127.0.0.1:${TEST_PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    env: {
      PORT: TEST_PORT,
      USE_MOCK_PROVIDER: 'true',
      DATABASE_PATH: TEST_DB_PATH,
    },
  },
});
