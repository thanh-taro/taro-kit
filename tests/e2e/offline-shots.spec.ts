// Screenshots of F-011's states for design comparison (design/canvas/CMP-AppShell, HomeStates*, CMP-ToolCard
// unavailable, ToolStates* offline). Not a regression test: runs only with SHOTS=1 on Chromium, writes to
// .build-my-app/reports/shots/F-011/.
import { join } from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { FX, PROD } from './ports.ts';
import { startVersionedHost } from './support/versioned-server.ts';

test.skip(({ browserName }) => !process.env.SHOTS || browserName !== 'chromium', 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-011');
const sizes = {
  desktop: { width: 1440, height: 900 },
  medium: { width: 1000, height: 800 },
  mobile: { width: 390, height: 844 },
} as const;
const shot = (page: Page, name: string) => page.screenshot({ path: join(out, `${name}.png`) });

async function visitOnline(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}
async function goOffline(context: BrowserContext, page: Page) {
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
}

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      const tag = `${size}-${scheme}`;

      test('offline: home, tool view and not found, served by the worker', async ({ page, context }) => {
        await visitOnline(page, `${PROD}/`);
        await goOffline(context, page);
        await page.goto(`${PROD}/`);
        await expect(page.getByText("You're offline.").locator('visible=true')).toBeVisible();
        await shot(page, `home-offline-${tag}`);
        await page.goto(`${PROD}/t/sample-dev/`);
        await expect(page.getByText('needs the internet')).toBeVisible();
        await shot(page, `tool-offline-${tag}`);
        await page.goto(`${PROD}/t/does-not-exist/`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await shot(page, `not-found-offline-${tag}`);
      });

      test('offline: unavailable cards (recents region and catalog cards)', async ({ page, context }) => {
        await page.addInitScript(() => {
          if (sessionStorage.getItem('seeded')) return;
          localStorage.setItem(
            'tarokit.personal',
            JSON.stringify({
              schemaVersion: 1,
              favorites: [],
              recents: ['fx-linked', 'ft-embedded', 'ft-offline'].map((toolId, i) => ({
                toolId,
                openedAt: new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString(),
              })),
              preferences: { theme: 'system' },
              daysUsed: [],
            }),
          );
          sessionStorage.setItem('seeded', '1');
        });
        await page.goto(`${FX}/__fixtures__/recents/`);
        await expect(page.getByRole('region', { name: 'Recently used' }).locator('.tk-toolcard')).toHaveCount(3);
        await goOffline(context, page);
        await expect(page.locator('[data-unavailable]').first()).toBeVisible();
        await shot(page, `cards-unavailable-${tag}`);
      });

      test('update ready', async ({ page }) => {
        const host = await startVersionedHost();
        try {
          await visitOnline(page, `${host.origin}/`);
          await page.reload();
          await expect(page.locator('html')).toHaveAttribute('data-tk-worker', 'registered');
          host.publish();
          await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
          await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
          await shot(page, `update-ready-${tag}`);
        } finally {
          await host.close();
        }
      });
    });
