// Screenshots of F-006's states for design comparison (design/canvas/SettingsDesktop, SettingsMobile,
// SettingsDialogs*, Home* recents). Not a regression test: runs only with SHOTS=1, writes to
// .build-my-app/reports/shots/F-006/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PORTAL, serveSites } from './support/sites.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-006');
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage });

const seed = (page: Page) =>
  page.addInitScript((key) => {
    if (window !== window.top || sessionStorage.getItem('seeded')) return;
    const at = (i: number) => new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString();
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        favorites: [{ toolId: 'fx-02', pinnedAt: at(0) }],
        recents: ['fx-linked', 'fx-01', 'fx-02', 'fx-03', 'ft-embedded', 'fx-04'].map((toolId, i) => ({
          toolId,
          openedAt: at(i),
        })),
        preferences: { theme: 'system' },
        daysUsed: ['2026-10-14', '2026-10-13', '2026-10-11', '2026-10-10', '2026-10-09', '2026-10-06', '2026-10-05'],
      }),
    );
    sessionStorage.setItem('seeded', '1');
  }, 'tarokit.personal');

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      test.beforeEach(async ({ page, context }) => {
        await serveSites(context);
        await page.clock.setFixedTime(new Date(2026, 9, 14, 10, 0));
        await seed(page);
      });
      const tag = `${size}-${scheme}`;

      test('settings: days used and the clear-recents confirmation', async ({ page }) => {
        await page.goto(`${PORTAL}/settings/`);
        await expect(page.getByText("You've used TaroKit on 7 of the last 14 days")).toBeVisible();
        await shot(page, `settings-${tag}`, true);
        await page.getByRole('button', { name: 'Clear recent tools' }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await shot(page, `settings-clear-confirm-${tag}`);
      });

      test('recents region (home stand-in)', async ({ page }) => {
        await page.goto(`${PORTAL}/__fixtures__/recents/`);
        const region = page.getByRole('region', { name: 'Recently used' });
        await expect(region.locator('.tk-toolcard')).toHaveCount(5);
        await shot(page, `recents-${tag}`);
      });
    });
