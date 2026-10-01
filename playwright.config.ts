import { defineConfig, devices } from '@playwright/test';

const TEST_PORT = process.env.TEST_PORT || '3100';

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
    url: `http://localhost:${TEST_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60 * 1000,
    env: {
      PORT: TEST_PORT,
      USE_MOCK_PROVIDER: 'true',
    },
  },
});
