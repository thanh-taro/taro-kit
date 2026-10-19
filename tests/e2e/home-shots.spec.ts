// Screenshots of SCR-Home's states for design comparison (design/canvas/HomeDesktop, HomeMobile, HomeStatesDesktop,
// HomeStatesMobile). Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-007/.
// Production content, with the viewer's clock 3 days after the sample tools were added, so what's new shows.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PROD } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-007');
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string) => page.screenshot({ path: join(out, `${name}.png`), fullPage: true });

const seed = (page: Page, favorites: string[], recents: string[]) =>
  page.addInitScript(
    ([favs, recs]) => {
      if (sessionStorage.getItem('seeded')) return;
      const at = (i: number) => new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString();
      localStorage.setItem(
        'tarokit.personal',
        JSON.stringify({
          schemaVersion: 1,
          favorites: favs.map((toolId, i) => ({ toolId, pinnedAt: at(i) })),
          recents: recs.map((toolId, i) => ({ toolId, openedAt: at(i) })),
          preferences: { theme: 'system' },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [favorites, recents] as const,
  );
const ready = async (page: Page) => {
  await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
  await expect(page.locator('[data-tk-whatsnew-ready]')).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
};

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme, ...(size === 'mobile' ? { hasTouch: true, isMobile: true } : {}) });
      test.beforeEach(async ({ page }) => {
        await page.clock.setFixedTime(new Date(2026, 9, 16, 8, 42));
      });
      const tag = `${size}-${scheme}`;

      test('populated', async ({ page }) => {
        await seed(page, ['sample-dev', 'sample-converter'], ['sample-media', 'sample-productivity']);
        await page.goto(`${PROD}/`);
        await ready(page);
        await shot(page, `home-populated-${tag}`);
      });

      test('first visit', async ({ page }) => {
        await page.goto(`${PROD}/`);
        await ready(page);
        await shot(page, `home-first-visit-${tag}`);
      });

      test('no favorites (recents only)', async ({ page }) => {
        await seed(page, [], ['sample-media', 'sample-dev']);
        await page.goto(`${PROD}/`);
        await ready(page);
        await shot(page, `home-no-favorites-${tag}`);
      });

      test('no recents (favorites only)', async ({ page }) => {
        await seed(page, ['sample-dev', 'sample-media', 'sample-converter'], []);
        await page.goto(`${PROD}/`);
        await ready(page);
        await shot(page, `home-no-recents-${tag}`);
      });

      test('storage unavailable', async ({ page }) => {
        await page.addInitScript(() => {
          Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
              throw new DOMException('The operation is insecure.', 'SecurityError');
            },
          });
        });
        await page.goto(`${PROD}/`);
        await ready(page);
        await shot(page, `home-storage-unavailable-${tag}`);
      });

      test('offline', async ({ page, context }) => {
        await seed(page, ['sample-dev', 'sample-converter'], ['sample-media']);
        await page.goto(`${PROD}/`);
        await page.evaluate(async () => {
          await navigator.serviceWorker.ready;
        });
        await context.setOffline(true);
        await page.reload();
        await ready(page);
        await expect(page.locator('main [data-unavailable]').first()).toBeVisible();
        await shot(page, `home-offline-${tag}`);
      });
    });
