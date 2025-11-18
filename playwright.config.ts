import { defineConfig, devices } from '@playwright/test';
import { getTestConfig } from './tests/config/test-config';

const runtimeConfig = getTestConfig();
const tagFilter = process.env.TEST_TAG ? new RegExp(process.env.TEST_TAG, 'i') : undefined;

export default defineConfig({
  testDir: './tests',
  timeout: Math.max(runtimeConfig.timeout.navigation, 60000),
  expect: {
    timeout: runtimeConfig.timeout.assertion,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: runtimeConfig.retries.count,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  grep: tagFilter,
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: runtimeConfig.baseURL,
    trace: runtimeConfig.trace.mode,
    actionTimeout: runtimeConfig.timeout.action,
    navigationTimeout: runtimeConfig.timeout.navigation,
    screenshot: runtimeConfig.screenshots.mode,
    video: runtimeConfig.videos.mode,
    extraHTTPHeaders: {
      'x-test-suite': 'web-structure-aware',
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'desktop-webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

