// Screenshots of CMP-CommandPalette and the shell's search control for design comparison
// (design/canvas/CMP-CommandPalette, PaletteDesktop, PaletteMobile, CMP-AppShell). Not a regression test: runs
// only with SHOTS=1 and writes to .build-my-app/reports/shots/F-004/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { FX } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-004');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string) => page.screenshot({ path: join(out, `${name}.png`) });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search TaroKit' });
const field = (page: Page) => dialog(page).getByRole('combobox');

const seed = (page: Page) =>
  page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    const at = (m: number) => new Date(Date.UTC(2026, 9, 10, 12, m)).toISOString();
    localStorage.setItem(
      'tarokit.personal',
      JSON.stringify({
        schemaVersion: 1,
        favorites: ['fx-json-formatter', 'fx-unit-converter', 'fx-base64'].map((toolId, i) => ({
          toolId,
          pinnedAt: at(i),
        })),
        recents: ['fx-image-resizer', 'fx-linked'].map((toolId, i) => ({ toolId, openedAt: at(59 - i) })),
        preferences: { theme: 'system' },
        daysUsed: [],
      }),
    );
    sessionStorage.setItem('seeded', '1');
  });

async function open(page: Page) {
  await page.getByRole('banner').locator('[data-tk-palette-open]:visible').first().click();
  await expect(dialog(page).locator('.tk-palette')).toHaveAttribute('data-ready', '');
}

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      const tag = `${size}-${scheme}`;

      test('shell search control and palette states', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: FX });
        await seed(page);
        await page.goto(`${FX}/`);
        await page.waitForLoadState('load');
        await page.getByRole('banner').screenshot({ path: join(out, `shell-${tag}.png`) });
        await open(page);
        await shot(page, `empty-query-${tag}`);
        await field(page).fill('json');
        await expect(dialog(page).getByRole('group', { name: 'Tools' })).toBeVisible();
        await shot(page, `results-${tag}`);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await shot(page, `keyboard-focus-${tag}`);
        await field(page).fill('zzzz');
        await expect(dialog(page).getByText('Browse all my tools')).toBeVisible();
        await shot(page, `no-results-${tag}`);
        await page.keyboard.press('Escape');

        await page.goto(`${FX}/t/ft-embedded/`);
        await page.waitForLoadState('load');
        if (size === 'mobile')
          await page
            .getByRole('toolbar')
            .first()
            .screenshot({ path: join(out, `toolheader-search-${tag}.png`) });
        if (size === 'desktop')
          await page.getByRole('banner').screenshot({ path: join(out, `shell-compact-${tag}.png`) });
        const apple = await page.evaluate(() => {
          const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
          return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || '');
        });
        await page.keyboard.press(apple ? 'Meta+k' : 'Control+k');
        await expect(dialog(page).locator('.tk-palette')).toHaveAttribute('data-ready', '');
        await field(page).fill('copy');
        await page.keyboard.press('Enter');
        await expect(dialog(page).getByText('Link copied')).toBeVisible();
        await shot(page, `copied-${tag}`);

        await page.route('**/data/catalog.*.json', (route) => route.abort());
        await page.goto(`${FX}/about/`);
        await page.waitForLoadState('load');
        await open(page);
        await expect(dialog(page).getByText("I couldn't load my tools")).toBeVisible();
        await shot(page, `unavailable-${tag}`);
      });
    });
