// Screenshots of every SCR-Now state for design comparison (design/canvas/NowDesktop, NowMobile, EmptyPagesDesktop).
// Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-010/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { FX, PROD, SAMPLES_CONTENT } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const root = join(import.meta.dirname, '../..');
const noteDate = loadRegistry({ root, contentDir: join(root, SAMPLES_CONTENT) }).now?.updated ?? '2026-10-13';
const out = join(root, '.build-my-app/reports/shots/F-010');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const at = (days: number) => {
  const d = new Date(`${noteDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d;
};
const shot = (page: Page, name: string) => page.screenshot({ path: join(out, `${name}.png`), fullPage: true });

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      const tag = `${size}-${scheme}`;

      test('default and stale', async ({ page }) => {
        await page.clock.setFixedTime(at(10));
        await page.goto(`${PROD}/now/`);
        await expect(page.getByTestId('now-stale')).toHaveAttribute('data-state', 'fresh');
        await shot(page, `default-${tag}`);
        await page.clock.setFixedTime(at(120));
        await page.goto(`${PROD}/now/`);
        await expect(page.getByTestId('now-stale')).toHaveAttribute('data-state', 'stale');
        await shot(page, `stale-${tag}`);
      });

      test('no note and empty', async ({ page }) => {
        await page.goto(`${FX}/__fixtures__/now-no-note/`);
        await shot(page, `no-note-${tag}`);
        await page.goto(`${FX}/__fixtures__/now-empty/`);
        await shot(page, `empty-${tag}`);
      });
    });
