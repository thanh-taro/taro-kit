// F-012.R1–R4 in the built portal: system follow, settings choice, header toggle, no flash on load.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'tarokit.personal';
const html = (page: Page) => page.locator('html');
const storedTheme = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.preferences?.theme, STORAGE_KEY);
/** Waits for the islands and the theme script (both are module scripts, so they run before `load`). */
const ready = async (page: Page) => {
  await page.waitForLoadState('load');
  await expect(page.getByRole('radio').first()).toBeEnabled();
};
const seed = (page: Page, theme: string) =>
  page.addInitScript(
    ([key, t]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(
          key,
          JSON.stringify({ schemaVersion: 1, favorites: [], recents: [], preferences: { theme: t }, daysUsed: [] }),
        );
        sessionStorage.setItem('seeded', '1');
      }
    },
    [STORAGE_KEY, theme],
  );

test.describe('F-012 theme in the portal', () => {
  test('F012_AC1 system follows a dark device and switches live when it turns light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/settings/');
    await ready(page);
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'System' })).toBeChecked();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  });

  test('F012_AC2 picking dark in settings while light turns the portal dark at once', async ({ page }) => {
    await seed(page, 'light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings/');
    await ready(page);
    await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();
    const navigations: string[] = [];
    page.on('framenavigated', (f) => navigations.push(f.url()));
    await page.getByRole('radio', { name: 'Dark' }).check();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    expect(await storedTheme(page)).toBe('dark');
    expect(navigations).toEqual([]);
  });

  test('F012_AC2 the theme choice is a keyboard-operable radiogroup with all three choices', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/settings/');
    await ready(page);
    const group = page.getByRole('group', { name: 'Theme' });
    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(3);
    for (const [i, name] of ['System', 'Light', 'Dark'].entries())
      await expect(radios.nth(i)).toHaveAccessibleName(name);
    await group.getByRole('radio', { name: 'System' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('radio', { name: 'Light' })).toBeChecked();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('F012_AC3 on system-dark the header toggle shows light and stores light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    expect(await storedTheme(page)).toBe('light');
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  });

  test('F012_AC3 the toggle and the settings choice stay in step', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings/');
    await ready(page);
    await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  });

  test('F012_AC4 after choosing dark, the first painted screen on reload is already dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings/');
    await ready(page);
    await page.getByRole('radio', { name: 'Dark' }).check();
    // Record data-theme at the moment the first visible element (the skip link) is parsed, before any paint.
    await page.addInitScript(() => {
      new MutationObserver((_, observer) => {
        if (document.querySelector('.skip')) {
          (window as unknown as { firstTheme?: string }).firstTheme = document.documentElement.dataset.theme;
          observer.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { firstTheme?: string }).firstTheme)).toBe('dark');
  });

  test('F-012 edge case: with storage blocked, the theme follows the system and a choice lasts the session', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings/');
    await ready(page);
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await page.getByRole('radio', { name: 'Dark' }).check();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`NFR-03 settings has no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/settings/');
      await ready(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});
