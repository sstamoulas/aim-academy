import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  globalSetup:    './e2e/setup/globalSetup.ts',
  globalTeardown: './e2e/setup/globalTeardown.ts',

  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout:    15_000,
    navigationTimeout: 30_000,
  },

  // Give assertions enough time to wait for Firestore data from the emulator
  expect: { timeout: 10_000 },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Run Vite in emulator mode (+ coverage instrumentation when VITE_COVERAGE=true)
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      VITE_USE_EMULATOR: 'true',
      VITE_COVERAGE: process.env.VITE_COVERAGE ?? 'false',
    },
  },
})
