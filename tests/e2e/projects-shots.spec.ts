// Screenshots of SCR-Projects for design comparison (design/canvas/ProjectsDesktop, ProjectsMobile,
// EmptyPagesDesktop). Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-009/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { FX, PROD } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-009');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage });

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      const tag = `${size}-${scheme}`;

      test('default, focused from its address, and empty', async ({ page }) => {
        await page.goto(`${FX}/__fixtures__/projects/`);
        await expect(page.getByRole('img', { name: 'Screenshot of Pocket Budget' })).toBeVisible();
        await shot(page, `default-${tag}`, true);
        await page.goto('about:blank');
        await page.goto(`${FX}/__fixtures__/projects/#unity-game`);
        await expect(page.locator('li[id="unity-game"]')).toBeFocused();
        await shot(page, `address-${tag}`);
        await page.goto(`${PROD}/projects/`);
        await shot(page, `empty-${tag}`);
      });
    });
