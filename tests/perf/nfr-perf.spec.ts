// Performance gates for NFR-01 and NFR-02 (ADR-0006, "Notes from spike SP-6"; architecture.md "Performance
// baselines"), on the mobile lab profile (reference-environment.md) against `astro preview` of the sample build
// (dist-samples/, with the service worker). The `perf` Playwright project, Chromium only, one worker:
// `pnpm perf` (`playwright test --project=perf`). It is not part of the engine runs; publish.yml runs it.
// - Every gate is the median of 5 runs, each in a fresh context, and asserts the NFR's own target.
// - NFR-02 is measured over a generated 500-entry catalog (support/catalog-500.ts), served in place of the build's
//   catalog data file. Per run, the gated value is the p75 of the run's interactions (SP-6: gate on the median and
//   p75, not the max, since single host stalls show up in any rig); median and p95 are logged.
import { expect, test, type Page } from '@playwright/test';
import { PROD } from '../e2e/ports.ts';
import { catalog500Json } from './support/catalog-500.ts';
import {
  firstView,
  median,
  newContext,
  probe,
  quantile,
  round,
  RUNS,
  throttle,
  type FirstView,
  type Interaction,
} from './support/rig.ts';

/** NFR-01 and NFR-02 targets, in ms (architecture.md "Performance baselines"). */
const TARGET = { firstVisit: 1500, repeatVisit: 500, paletteOpen: 100, keystroke: 50 } as const;

function summary(label: string, runs: FirstView[]) {
  const pick = (k: keyof FirstView) => runs.map((r) => round(r[k]));
  const line = (['usable', 'rendered', 'armed', 'responded', 'fcp', 'lcp'] as const)
    .map((k) => `${k} ${round(median(pick(k)))} ms [${pick(k).join(', ')}]`)
    .join('; ');
  console.log(`${label}: median of ${runs.length}: ${line}`);
  test.info().annotations.push({ type: label, description: line });
}

test.describe('NFR-01 fast first view (home, mobile lab profile)', () => {
  test('NFR-01 first visit: greeting and search usable within 1.5 s (median of 5)', async ({ browser }) => {
    const runs: FirstView[] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await newContext(browser);
      runs.push(await firstView(await context.newPage(), `${PROD}/`));
      await context.close();
    }
    summary('NFR-01 first visit', runs);
    expect(median(runs.map((r) => r.usable))).toBeLessThanOrEqual(TARGET.firstVisit);
  });

  test('NFR-01 repeat visit from the precache: greeting and search usable within 0.5 s (median of 5)', async ({
    browser,
  }) => {
    const runs: FirstView[] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await newContext(browser);
      // The previous visit: the service worker is active, so its precache is complete (MOD-Offline, SP-4).
      const first = await context.newPage();
      await first.goto(`${PROD}/`);
      await first.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await first.close();
      const page = await context.newPage();
      runs.push(await firstView(page, `${PROD}/`));
      expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
      await context.close();
    }
    summary('NFR-01 repeat visit', runs);
    expect(median(runs.map((r) => r.usable))).toBeLessThanOrEqual(TARGET.repeatVisit);
  });
});

test.describe('NFR-02 instant search (palette, 500 catalog entries, mobile lab profile)', () => {
  let catalog: string;
  test.beforeAll(() => {
    catalog = catalog500Json();
  });

  /** A throttled home page whose palette island is hydrated with the 500-entry catalog. */
  async function readyPalette(page: Page) {
    let served = 0;
    await page.route(/\/data\/catalog\.[0-9a-f]+\.json$/, (route) => {
      served++;
      return route.fulfill({ contentType: 'application/json', body: catalog });
    });
    await page.addInitScript(probe);
    await throttle(page);
    await page.goto(`${PROD}/`);
    await page.locator('.tk-palette[data-ready]').waitFor({ state: 'attached', timeout: 20_000 });
    expect(served, 'the island loaded the 500-entry catalog').toBeGreaterThan(0);
    // Mod+K as the bootstrap reads it (Meta on Apple platforms, else Control; logic.ts isApplePlatform).
    const apple = await page.evaluate(() => {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || '');
    });
    return apple ? 'Meta+k' : 'Control+k';
  }

  async function measured(page: Page, kind: 'open' | 'key', act: () => Promise<void>): Promise<Interaction> {
    await page.evaluate((k) => window.__tkPerf.arm(k), kind);
    await act();
    return page.evaluate(() => window.__tkPerf.settle());
  }

  function gate(label: string, perRun: Interaction[][], target: number) {
    const p75s = perRun.map((xs) =>
      round(
        quantile(
          xs.map((x) => x.latency),
          0.75,
        ),
      ),
    );
    const all = perRun.flat();
    const stat = (f: (x: Interaction) => number, q: number) => round(quantile(all.map(f), q));
    const line =
      `p75 per run [${p75s.join(', ')}] ms, median ${round(median(p75s))} ms; all ${all.length}: ` +
      `median ${stat((x) => x.latency, 0.5)}, p95 ${stat((x) => x.latency, 0.95)}, max ${stat((x) => x.latency, 1)} ms; ` +
      `Event Timing p75 ${stat((x) => x.eventTiming, 0.75)}, frame probe p75 ${stat((x) => x.frame, 0.75)} ms`;
    console.log(`${label}: ${line}`);
    test.info().annotations.push({ type: label, description: line });
    expect(median(p75s)).toBeLessThanOrEqual(target);
  }

  test('NFR-02 the palette opens within 100 ms of the shortcut (median of 5 runs)', async ({ browser }) => {
    const perRun: Interaction[][] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await newContext(browser, { serviceWorkers: 'block' });
      const page = await context.newPage();
      const shortcut = await readyPalette(page);
      const dialog = page.locator('#tk-palette');
      const opens: Interaction[] = [];
      for (let j = 0; j < 5; j++) {
        opens.push(await measured(page, 'open', () => page.keyboard.press(shortcut)));
        await expect(dialog).toHaveAttribute('open', '');
        await page.keyboard.press('Escape');
        await expect(dialog).not.toHaveAttribute('open', '');
      }
      perRun.push(opens);
      await context.close();
    }
    gate('NFR-02 palette open', perRun, TARGET.paletteOpen);
  });

  test('NFR-02 results update within 50 ms per keystroke with 500 entries (median of 5 runs)', async ({ browser }) => {
    const queries = ['color tool', 'json', 'convert', 'timer 0', 'dong ho', 'image viewer', 'unit', 'regex c'];
    const perRun: Interaction[][] = [];
    for (let i = 0; i < RUNS; i++) {
      const context = await newContext(browser, { serviceWorkers: 'block' });
      const page = await context.newPage();
      await page.keyboard.press(await readyPalette(page));
      const field = page.locator('#tk-palette-q');
      await expect(field).toBeFocused();
      const keys: Interaction[] = [];
      for (const q of queries) {
        for (const ch of q)
          keys.push(await measured(page, 'key', () => page.keyboard.press(ch === ' ' ? 'Space' : ch)));
        await expect(field).toHaveValue(q);
        await field.fill('');
      }
      perRun.push(keys);
      await context.close();
    }
    gate('NFR-02 keystroke', perRun, TARGET.keystroke);
  });
});
