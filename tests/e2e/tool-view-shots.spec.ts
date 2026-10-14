// Screenshots of every SCR-ToolView state for design comparison (design/canvas/Tool*.dc.html, LinkedDesktop,
// NotFound*). Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-003/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { serveSites, toolPage, type Sites } from './support/sites.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-003');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string) => page.screenshot({ path: join(out, `${name}.png`) });

let sites: Sites;
for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      test.beforeEach(async ({ context }) => {
        sites = await serveSites(context);
      });
      const tag = `${size}-${scheme}`;

      test('default, loading and slow', async ({ page }) => {
        await page.goto(toolPage('ft-embedded'));
        await expect(page.frameLocator('iframe').locator('#status')).toHaveText('tool loaded');
        await shot(page, `default-${tag}`);
        await page.clock.install();
        const held = sites.holdTools();
        await page.goto(toolPage('ft-embedded'));
        await expect(page.getByText('Getting Fixture embedded tool ready…')).toBeVisible();
        await shot(page, `loading-${tag}`);
        await page.clock.runFor(10_000);
        await expect(page.getByText('is taking its time')).toBeVisible();
        await shot(page, `slow-${tag}`);
        held.release();
      });

      test('offline', async ({ page, context }) => {
        await context.setOffline(true);
        await page.goto(toolPage('ft-embedded'));
        await expect(page.getByText('needs the internet')).toBeVisible();
        await shot(page, `offline-${tag}`);
      });

      test('linked and not found', async ({ page }) => {
        await page.goto(toolPage('fx-linked'));
        await expect(page.getByText('lives on its own site')).toBeVisible();
        await shot(page, `linked-${tag}`);
        await page.goto(toolPage('does-not-exist'));
        await shot(page, `not-found-${tag}`);
      });
    });
