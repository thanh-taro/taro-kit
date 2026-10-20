// End-to-end (ADR-0006): against `astro preview` serving production builds of test content, on three engines.
// PRs run Chromium only (`--project=chromium`); the full matrix gates publishing.
import { defineConfig, devices } from '@playwright/test';
import { FIXTURES_PORT, PORT } from './tests/e2e/ports.ts';

// Tests-only pages (tests/fixtures/pages) are built into dist-fixtures/ and served on FIXTURES_PORT; see astro.config.ts.
const fixturesEnv = { TAROKIT_FIXTURES: '1', TAROKIT_CONTENT_DIR: 'tests/fixtures/content/F005-favorites' };
// The production pages over the sample fixture content (tests/fixtures/content/samples), built into dist-samples/ with
// the service worker, so no test depends on content/ (release C-1). `pnpm build` and dist/ stay the real site.
const samplesEnv = {
  TAROKIT_FIXTURES: '',
  TAROKIT_SAMPLES: '1',
  TAROKIT_CONTENT_DIR: 'tests/fixtures/content/samples',
};

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      // The sample build is made here and served from dist-samples/. `--ignore-lock` keeps the server in
      // the foreground: Astro 7 otherwise detaches it when it detects a coding agent, and leaks it.
      command: `pnpm run build:samples && pnpm exec astro preview --port ${PORT} --ignore-lock`,
      env: samplesEnv,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // The fixture build is made here, from the same sources, so it never reaches dist/.
      command: `pnpm run build:fixtures && pnpm exec astro preview --port ${FIXTURES_PORT} --ignore-lock`,
      env: fixturesEnv,
      url: `http://localhost:${FIXTURES_PORT}/__fixtures__/favorites/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
