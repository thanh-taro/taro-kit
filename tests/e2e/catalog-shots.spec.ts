// Screenshots of SCR-Catalog for design comparison (design/canvas/CatalogDesktop, CatalogMobile,
// CatalogStatesDesktop). Not a regression test: runs only with SHOTS=1, writes to .build-my-app/reports/shots/F-002/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { FX } from './ports.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-002');
const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage });

for (const [size, viewport] of Object.entries(sizes))
  for (const scheme of ['dark', 'light'] as const)
    test.describe(`${size} ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });
      const tag = `${size}-${scheme}`;

      test('default, search, no results and empty', async ({ page }) => {
        await page.goto(`${FX}/tools/`);
        await expect(page.getByTestId('catalog')).toHaveAttribute('data-ready', '');
        await shot(page, `default-${tag}`, true);
        const field = page.getByRole('searchbox', { name: 'Filter my tools' });
        await field.fill('image');
        await expect(page.getByTestId('catalog-results')).toBeVisible();
        await shot(page, `search-${tag}`);
        await field.fill('pdf');
        await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
        await shot(page, `no-results-${tag}`);
        await page.goto(`${FX}/__fixtures__/catalog-empty/`);
        await shot(page, `empty-${tag}`);
      });
    });
