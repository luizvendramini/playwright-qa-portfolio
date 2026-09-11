import { defineConfig, devices } from '@playwright/test';

/**
 * Configuracao central do Playwright.
 *
 * `webServer` sobe a mock-app automaticamente antes da suite (e derruba ao final),
 * tanto localmente quanto no CI, eliminando a necessidade de qualquer
 * dependencia externa (sites publicos de demonstracao, APIs de terceiros).
 * Isso torna a suite deterministica e reproduzivel em qualquer ambiente.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node mock-app/server.js',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
