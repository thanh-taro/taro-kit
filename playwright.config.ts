// End-to-end (ADR-0006): against `astro preview` serving the real build, on three engines.
// PRs run Chromium only (`--project=chromium`); the full matrix gates publishing.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
/** Tests-only pages (tests/fixtures/pages), built into dist-fixtures/ and served here; see astro.config.ts. */
const FIXTURES_PORT = 4322;
const fixturesEnv = { TAROKIT_FIXTURES: '1', TAROKIT_CONTENT_DIR: 'tests/fixtures/content/F005-favorites' };

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
      // The build must exist (`pnpm build`); preview only serves dist/. `--ignore-lock` keeps the server in
      // the foreground: Astro 7 otherwise detaches it when it detects a coding agent, and leaks it.
      command: `pnpm exec astro preview --port ${PORT} --ignore-lock`,
      url: `http://localhost:${PORT}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
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
