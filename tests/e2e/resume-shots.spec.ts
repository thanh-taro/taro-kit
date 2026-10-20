// Screenshots of SCR-Resume's default state for design comparison (design/canvas/ResumeDesktop, ResumeMobile), in both
// themes, and of the full shell with its six navigation items at the widths where it is tightest.
// Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-017/.
import { join } from 'node:path';
import { test, type Page } from '@playwright/test';
import { PROD } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const root = join(import.meta.dirname, '../..');
const out = join(root, '.build-my-app/reports/shots/F-017');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string, fullPage = true) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage });

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });

      test('default', async ({ page }) => {
        await page.goto(`${PROD}/resume/`);
        await page.waitForLoadState('load');
        await shot(page, `default-${size}-${scheme}`);
      });

      test('about pointer', async ({ page }) => {
        await page.goto(`${PROD}/about/`);
        await page.waitForLoadState('load');
        await shot(page, `about-${size}-${scheme}`);
      });
    });

test.describe('shell widths', () => {
  test.use({ colorScheme: 'dark' });
  for (const width of [320, 721, 881, 960, 1119])
    test(`shell at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 400 });
      await page.goto(`${PROD}/resume/`);
      await page.waitForLoadState('load');
      await shot(page, `shell-${width}`, false);
    });
});
