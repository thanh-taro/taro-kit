// End-to-end (ADR-0006): against `astro preview` serving production builds of test content, on three engines.
// PRs run Chromium only (`--project=chromium`); the full matrix gates publishing.
// The `perf` project (tests/perf, NFR-01 and NFR-02 gates; ADR-0006 SP-6) is defined only when it is asked for by
// name (`--project=perf`, as `pnpm perf` and publish.yml do), so an unfiltered run stays the three engines.
import { defineConfig, devices } from '@playwright/test';
import { FIXTURES_PORT, PORT } from './tests/e2e/ports.ts';

// Tests-only pages (tests/fixtures/pages) are built into dist-fixtures/ and served on FIXTURES_PORT; see astro.config.ts.
const fixturesEnv = { TAROKIT_FIXTURES: '1', TAROKIT_CONTENT_DIR: 'tests/fixtures/content/F005-favorites' };
const fixturesServer = {
  // The fixture build is made here, from the same sources, so it never reaches dist/.
  command: `pnpm run build:fixtures && pnpm exec astro preview --port ${FIXTURES_PORT} --ignore-lock`,
  env: fixturesEnv,
  url: `http://localhost:${FIXTURES_PORT}/__fixtures__/favorites/`,
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
};
// The production pages over the sample fixture content (tests/fixtures/content/samples), built into dist-samples/ with
// the service worker, so no test depends on content/ (release C-1). `pnpm build` and dist/ stay the real site.
const samplesEnv = {
  TAROKIT_FIXTURES: '',
  TAROKIT_SAMPLES: '1',
  TAROKIT_CONTENT_DIR: 'tests/fixtures/content/samples',
};

// The flag is passed on through the environment, so the worker processes load the same project list.
const args = process.argv.slice(2);
const asked = args.flatMap((a, i) =>
  a.startsWith('--project=') ? [a.slice(10)] : a === '--project' || a === '-p' ? [args[i + 1] ?? ''] : [],
);
if (asked.includes('perf')) process.env.TK_PERF = '1';
const perf = process.env.TK_PERF === '1';
const perfOnly = perf && asked.length > 0 && asked.every((p) => p === 'perf');

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
    // No Firefox project: Firefox is supported (NFR-10) but not tested (D-067, ADR-0006 note).
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Chromium for CDP throttling; one test at a time, so runs never share the CPU (SP-6: bimodal timings).
    ...(perf
      ? [
          {
            name: 'perf',
            testDir: 'tests/perf',
            use: { ...devices['Desktop Chrome'] },
            workers: 1,
            fullyParallel: false,
            timeout: 240_000,
          },
        ]
      : []),
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
    ...(perfOnly ? [] : [fixturesServer]),
  ],
});
