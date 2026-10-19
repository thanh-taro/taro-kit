// Screenshots of F-013's states for design comparison (design/canvas/SettingsDesktop, SettingsMobile,
// SettingsDialogsDesktop, SettingsDialogsMobile). Not a regression test: runs only with SHOTS=1, writes to
// .build-my-app/reports/shots/F-013/.
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { PORTAL, serveSites } from './support/sites.ts';

test.skip(!process.env.SHOTS, 'screenshots only with SHOTS=1');

const out = join(import.meta.dirname, '../../.build-my-app/reports/shots/F-013');
const fixtures = join(import.meta.dirname, '../fixtures/backups');
const sizes = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } } as const;
const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: join(out, `${name}.png`), fullPage });

const seed = (page: Page) =>
  page.addInitScript((key) => {
    if (window !== window.top || sessionStorage.getItem('seeded')) return;
    localStorage.setItem(
      key,
      JSON.stringify({
        schemaVersion: 1,
        favorites: [{ toolId: 'fx-02', pinnedAt: '2026-10-01T00:00:00.000Z' }],
        recents: [{ toolId: 'fx-01', openedAt: '2026-10-10T12:00:00.000Z' }],
        preferences: { theme: 'system' },
        daysUsed: ['2026-10-14', '2026-10-13', '2026-10-11', '2026-10-10', '2026-10-09', '2026-10-06'],
      }),
    );
    sessionStorage.setItem('seeded', '1');
  }, 'tarokit.personal');

async function pick(page: Page, name: string) {
  const button = page.getByRole('button', { name: 'Import from file' });
  await expect(button).toBeEnabled();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), button.click()]);
  await chooser.setFiles(join(fixtures, name));
}

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

      test('settings default', async ({ page }) => {
        await page.goto(`${PORTAL}/settings/`);
        await expect(page.getByText("You've used TaroKit on 6 of the last 14 days")).toBeVisible();
        await shot(page, `settings-${tag}`, true);
      });

      test('importing (progress on the import control)', async ({ page }) => {
        // The validator's code never arrives, so the control stays busy for the picture.
        await page.route('**/_astro/backup.*.js', () => new Promise(() => {}));
        await page.goto(`${PORTAL}/settings/`);
        await pick(page, 'F013_AC6-valid.json');
        await expect(page.getByRole('button', { name: 'Import from file' })).toHaveAttribute('aria-busy', 'true');
        await shot(page, `settings-importing-${tag}`);
      });

      for (const [reason, file] of [
        ['not-backup', 'F013_AC2-not-a-backup.json'],
        ['newer-version', 'F013_AC3-newer-version.json'],
        ['damaged', 'F013_AC4-duplicate-recents.json'],
        ['too-many', 'F013_AC10-21-recents.json'],
      ] as const)
        test(`import error: ${reason}`, async ({ page }) => {
          await page.goto(`${PORTAL}/settings/`);
          await pick(page, file);
          await expect(page.getByRole('alert')).toBeVisible();
          await shot(page, `settings-import-error-${reason}-${tag}`);
        });

      test('import confirm', async ({ page }) => {
        await page.goto(`${PORTAL}/settings/`);
        await pick(page, 'F013_AC6-valid.json');
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await shot(page, `settings-import-confirm-${tag}`);
      });

      test('erase confirm', async ({ page }) => {
        await page.goto(`${PORTAL}/settings/`);
        await page.getByRole('button', { name: 'Erase your data' }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await shot(page, `settings-erase-confirm-${tag}`);
      });

      test('erase not saved', async ({ page }) => {
        await page.goto(`${PORTAL}/settings/`);
        await expect(page.getByRole('button', { name: 'Erase your data' })).toBeEnabled();
        await page.evaluate(() => {
          Storage.prototype.setItem = () => {
            throw new DOMException('quota', 'QuotaExceededError');
          };
        });
        await page.getByRole('button', { name: 'Erase your data' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click();
        await expect(page.getByRole('alert')).toBeVisible();
        await shot(page, `settings-erase-unsaved-${tag}`, true);
      });
    });
