// F-013 Export and import personal data, end to end on the real settings page (SCR-Settings), served as
// https://tarokit.test from the fixture build (tests/e2e/support/sites.ts). Backup files are the fixtures in
// tests/fixtures/backups/, picked through Playwright's file chooser; exports are caught as downloads.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PORTAL, serveSites } from './support/sites.ts';

const STORAGE_KEY = 'tarokit.personal';
const SETTINGS = `${PORTAL}/settings/`;
const FIXTURES = join(import.meta.dirname, '../fixtures/backups');
const fixturePath = (name: string) => join(FIXTURES, name);
const fixtureData = (name: string) => JSON.parse(readFileSync(fixturePath(name), 'utf8')).data;

const IMPORT_CONFIRM = 'Replace your favorites, recents, theme and days used with the ones in this file?';
const ERASE_CONFIRM = "Erase all your TaroKit data on this device? This can't be undone.";
const invalid = (reason: string) => `I couldn't import that file because ${reason}. Nothing changed.`;
const REASONS = {
  notBackup: "it isn't a TaroKit backup",
  damaged: "it's damaged or incomplete",
  newerVersion: 'it came from a newer version of TaroKit',
  tooLarge: 'it has more favorites or recents than I can keep',
};

/** What is on the device before the test: favorites fx-09, recents fx-08, theme light, one day used. */
const CURRENT = {
  schemaVersion: 1,
  favorites: [{ toolId: 'fx-09', pinnedAt: '2026-09-01T00:00:00.000Z' }],
  recents: [{ toolId: 'fx-08', openedAt: '2026-09-02T00:00:00.000Z' }],
  preferences: { theme: 'light' },
  daysUsed: ['2026-10-13'],
};

/** Stores personal data before the first load only, as if from earlier visits. */
const seed = (page: Page, doc: unknown = CURRENT) =>
  page.addInitScript(
    ([key, text]) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      localStorage.setItem(key, text);
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, JSON.stringify(doc)] as const,
  );

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown, STORAGE_KEY);
const importButton = (page: Page) => page.getByRole('button', { name: 'Import from file' });
const importDialog = (page: Page) => page.getByRole('alertdialog', { name: IMPORT_CONFIRM });
const eraseDialog = (page: Page) => page.getByRole('alertdialog', { name: ERASE_CONFIRM });

/** Picks the fixture through the file chooser the import button opens. */
async function pick(page: Page, name: string) {
  await expect(importButton(page)).toBeEnabled();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), importButton(page).click()]);
  await chooser.setFiles(fixturePath(name));
}

test.beforeEach(async ({ context, page }) => {
  await serveSites(context);
  // The fixed clock keeps the day being recorded (RULE-13) the seeded one, so stored data compares exactly.
  await page.clock.setFixedTime(new Date(2026, 9, 13, 10, 0));
});

test.describe('F-013.R1 / R6 export', () => {
  test('F013_AC1 exporting on 2026-10-13 saves a file with that date in its name holding all personal data', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const exportButton = page.getByRole('button', { name: 'Export your data' });
    await expect(exportButton).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download'), exportButton.click()]);
    expect(download.suggestedFilename()).toBe('tarokit-backup-2026-10-13.json');
    const file = JSON.parse(readFileSync((await download.path())!, 'utf8'));
    expect(file.format).toBe('tarokit-backup');
    expect(file.exportedAt).toBe(new Date(2026, 9, 13, 10, 0).toISOString());
    expect(file.data).toEqual(CURRENT);
  });

  test('F013_AC9 the note that tool data is not included is shown beside export', async ({ page }) => {
    await page.goto(SETTINGS);
    const note = page.getByText(
      'Your backup holds your favorites, recents, theme and days used. Each tool keeps its own data.',
    );
    await expect(note).toBeVisible();
    const exportBox = (await page.getByRole('button', { name: 'Export your data' }).boundingBox())!;
    const noteBox = (await note.boundingBox())!;
    expect(noteBox.y - (exportBox.y + exportBox.height)).toBeLessThan(80);
  });

  test('F-013 edge case: when the export cannot run, settings says so', async ({ page }) => {
    await page.route('**/_astro/backup.*.js', (route) => route.abort());
    await page.goto(SETTINGS);
    await page.getByRole('button', { name: 'Export your data' }).click();
    await expect(page.getByRole('alert')).toHaveText(/I couldn't save your backup just now\. Please try again\./);
  });
});

test.describe('F-013.R2 an invalid file is rejected with its reason and nothing changes', () => {
  const cases = [
    ['F013_AC2', 'F013_AC2-not-a-backup.json', REASONS.notBackup],
    ['F013_AC3', 'F013_AC3-newer-version.json', REASONS.newerVersion],
    ['F013_AC4', 'F013_AC4-duplicate-recents.json', REASONS.damaged],
    ['F013_AC10', 'F013_AC10-21-recents.json', REASONS.tooLarge],
    ['RULE-08', 'RULE-08-damaged-unparseable.json', REASONS.damaged],
  ] as const;
  for (const [id, name, why] of cases)
    test(`${id} importing ${name} shows “${why}” and personal data is unchanged`, async ({ page }) => {
      await seed(page);
      await page.goto(SETTINGS);
      await pick(page, name);
      await expect(page.getByRole('alert')).toHaveText(new RegExp(invalid(why).replace(/[.?]/g, '\\$&')));
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      expect(await stored(page)).toEqual(CURRENT);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    });
});

test.describe('F-013 edge case: a file that cannot be opened', () => {
  test('F-013 edge case: when the import cannot load, settings says so (not damaged) and nothing changes', async ({
    page,
  }) => {
    await seed(page);
    await page.route('**/_astro/backup.*.js', (route) => route.abort());
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC6-valid.json');
    await expect(page.getByRole('alert')).toHaveText(/I couldn't open that file just now\. Please try again\./);
    await expect(page.getByText(REASONS.damaged)).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(await stored(page)).toEqual(CURRENT);
  });
});

test.describe('F-013.R3 / R4 a valid file replaces the data only after confirming', () => {
  test('F-013.R2 the import control shows progress while the file is checked (SCR-Settings loading)', async ({
    page,
    context,
  }) => {
    await seed(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    // Added after serveSites, so it runs first, then falls back to the site routing.
    await context.route('**/_astro/backup.*.js', async (route) => {
      await held;
      await route.fallback();
    });
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC6-valid.json');
    await expect(importButton(page)).toHaveAttribute('aria-busy', 'true');
    release();
    await expect(importDialog(page)).toBeVisible();
    await expect(importButton(page)).not.toHaveAttribute('aria-busy', 'true');
  });

  test('F013_AC6 importing and confirming makes favorites, recents, theme and days used match the file', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC6-valid.json');
    await expect(importDialog(page)).toBeVisible();
    await expect(importDialog(page)).toContainText('F013_AC6-valid.json');
    // The file name is the dialog's description, so screen readers hear it.
    await expect(importDialog(page)).toHaveAccessibleDescription('F013_AC6-valid.json');
    // Focus moves into the confirmation, on Cancel (SCR-Settings accessibility).
    await expect(importDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    expect(await stored(page)).toEqual(CURRENT);
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(importDialog(page)).toBeHidden();
    await expect(importButton(page)).toBeFocused();
    expect(await stored(page)).toEqual(fixtureData('F013_AC6-valid.json'));
    // The theme from the file applies at once; days used follows the file (its 3 dates are in the window).
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByText("You've used TaroKit on 3 of the last 14 days")).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('F013_AC5 a file with no days used imports favorites, recents and theme, and days used is empty', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC5-no-days-used.json');
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(importDialog(page)).toBeHidden();
    const valid = fixtureData('F013_AC6-valid.json');
    expect(await stored(page)).toEqual({ ...valid, daysUsed: [] });
    await expect(page.getByText("You've used TaroKit on 0 of the last 14 days")).toBeVisible();
  });

  test('F013_AC7 importing and cancelling, by button or Escape, changes nothing', async ({ page }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC6-valid.json');
    await importDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(importDialog(page)).toBeHidden();
    await expect(importButton(page)).toBeFocused();
    expect(await stored(page)).toEqual(CURRENT);
    await pick(page, 'F013_AC6-valid.json');
    await expect(importDialog(page)).toBeVisible();
    await expect(importDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(importDialog(page)).toBeHidden();
    expect(await stored(page)).toEqual(CURRENT);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('F013_AC7 from the keyboard alone: Enter on Import, then Escape or Cancel, returns focus to Import (QA m9)', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await expect(importButton(page)).toBeEnabled();
    for (const close of ['Escape', 'Cancel'] as const) {
      await importButton(page).focus();
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Enter')]);
      await chooser.setFiles(fixturePath('F013_AC6-valid.json'));
      await expect(importDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
      if (close === 'Escape') await page.keyboard.press('Escape');
      else {
        await page.keyboard.press('Enter'); // on Cancel
      }
      await expect(importDialog(page)).toBeHidden();
      await expect(importButton(page), close).toBeFocused();
    }
    expect(await stored(page)).toEqual(CURRENT);
  });

  test('F013_AC7 after a programmatic file pick, cancelling still returns focus to Import (QA m9)', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await expect(importButton(page)).toBeEnabled();
    // The file arrives without the button ever holding focus (as when a picker gives focus back late).
    await page.getByTestId('import-file').setInputFiles(fixturePath('F013_AC6-valid.json'));
    await expect(importDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(importDialog(page)).toBeHidden();
    await expect(importButton(page)).toBeFocused();
  });

  test('F-013 edge case: another open window picks up the imported data', async ({ page, context }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const other = await context.newPage();
    await other.goto(SETTINGS);
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'light');
    await pick(page, 'F013_AC6-valid.json');
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(other.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(other.getByText("You've used TaroKit on 3 of the last 14 days")).toBeVisible();
  });

  test('F-013 edge case: when the device refuses the write, the import says it was not saved', async ({ page }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await expect(importButton(page)).toBeEnabled();
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota', 'QuotaExceededError');
      };
    });
    await pick(page, 'F013_AC6-valid.json');
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      /I imported that file for now, but couldn't save it on this device, so your old data may come back next time\./,
    );
    expect(await stored(page)).toEqual(CURRENT);
  });

  test('F-013 edge case: a confirmed import replaces a newer version’s document on the device', async ({ page }) => {
    await seed(page, { ...CURRENT, schemaVersion: 2, addedLater: true });
    await page.goto(SETTINGS);
    await pick(page, 'F013_AC6-valid.json');
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(importDialog(page)).toBeHidden();
    expect(await stored(page)).toEqual(fixtureData('F013_AC6-valid.json'));
  });

  test('NFR-05 importing reads the file locally: no request carries it and the address is unchanged', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    await expect(importButton(page)).toBeEnabled();
    // Background loads of the portal's own static files (e.g. the catalog data the palette fetches when
    // idle) may happen at any time; what must never happen is a request that could carry the file.
    const requests: string[] = [];
    page.on('request', (r) => {
      const ownStatic = r.method() === 'GET' && new URL(r.url()).origin === PORTAL && r.postData() === null;
      if (!ownStatic) requests.push(`${r.method()} ${r.url()}`);
    });
    await pick(page, 'F013_AC6-valid.json');
    await importDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(importDialog(page)).toBeHidden();
    expect(requests).toEqual([]);
    expect(page.url()).toBe(SETTINGS);
  });
});

test.describe('F-013.R5 erase', () => {
  test('F013_AC8 confirming erase empties favorites, recents and days used and sets the theme to system', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const erase = page.getByRole('button', { name: 'Erase your data' });
    await expect(erase).toBeEnabled();
    await erase.click();
    await expect(eraseDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await eraseDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(eraseDialog(page)).toBeHidden();
    await expect(erase).toBeFocused();
    expect(await stored(page)).toEqual({
      schemaVersion: 1,
      favorites: [],
      recents: [],
      preferences: { theme: 'system' },
      daysUsed: [],
    });
    await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
    await expect(page.getByText("You've used TaroKit on 0 of the last 14 days")).toBeVisible();
  });

  test('F013_AC8 erasing in one window empties favorites and recents in the other open windows', async ({
    page,
    context,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    // The tests-only favorites and recents pages (fixture build) list what each window shows.
    const favorites = await context.newPage();
    await favorites.goto(`${PORTAL}/__fixtures__/favorites/`);
    await expect(
      favorites.getByTestId('home').getByRole('link', { name: 'Fixture tool 09', exact: true }),
    ).toBeVisible();
    const recents = await context.newPage();
    await recents.goto(`${PORTAL}/__fixtures__/recents/`);
    await expect(recents.getByRole('region', { name: 'Recently used' })).toBeVisible();
    await page.bringToFront();
    await page.getByRole('button', { name: 'Erase your data' }).click();
    await eraseDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(eraseDialog(page)).toBeHidden();
    await expect(favorites.getByTestId('home').getByRole('link')).toHaveCount(0);
    await expect(recents.getByRole('region', { name: 'Recently used' })).toHaveCount(0);
  });

  test('F-013.R5 cancelling erase, by button or Escape, changes nothing', async ({ page }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const erase = page.getByRole('button', { name: 'Erase your data' });
    await erase.click();
    await eraseDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(eraseDialog(page)).toBeHidden();
    await erase.click();
    // Escape only once the confirmation has opened and taken focus.
    await expect(eraseDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(eraseDialog(page)).toBeHidden();
    expect(await stored(page)).toEqual(CURRENT);
  });

  test('F-013 edge case: when writing fails, erase removes the stored data instead', async ({ page }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const erase = page.getByRole('button', { name: 'Erase your data' });
    await expect(erase).toBeEnabled();
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota', 'QuotaExceededError');
      };
    });
    await erase.click();
    await eraseDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(eraseDialog(page)).toBeHidden();
    expect(await stored(page)).toBeNull();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('F-013 edge case: when the device refuses writing and removing, the erase says it was not saved', async ({
    page,
  }) => {
    await seed(page);
    await page.goto(SETTINGS);
    const erase = page.getByRole('button', { name: 'Erase your data' });
    await expect(erase).toBeEnabled();
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('quota', 'QuotaExceededError');
      };
      Storage.prototype.removeItem = () => {
        throw new DOMException('blocked', 'SecurityError');
      };
    });
    await erase.click();
    await eraseDialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      /I erased your data for now, but couldn't save that on this device, so it may come back next time\./,
    );
    expect(await stored(page)).toEqual(CURRENT);
  });
});

for (const scheme of ['dark', 'light'] as const)
  test(`NFR-03 settings with the import error and the import and erase confirmations have no axe violations (${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await seed(page, { ...CURRENT, preferences: { theme: 'system' } });
    await page.goto(SETTINGS);
    const violations = async () =>
      (await new AxeBuilder({ page }).analyze()).violations.map((v) => `${v.id}: ${v.nodes.length}`);
    await pick(page, 'F013_AC3-newer-version.json');
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await violations()).toEqual([]);
    await pick(page, 'F013_AC6-valid.json');
    await expect(importDialog(page)).toBeVisible();
    expect(await violations()).toEqual([]);
    await expect(importDialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(importDialog(page)).toBeHidden();
    await page.getByRole('button', { name: 'Erase your data' }).click();
    await expect(eraseDialog(page)).toBeVisible();
    expect(await violations()).toEqual([]);
  });
