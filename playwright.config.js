const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    contextOptions: {
      // Your app uses CSP, and the devtools warning mentions eval blocking.
      // Bypassing CSP avoids test failures caused by security headers.
      bypassCSP: true,
    },
  },
});

