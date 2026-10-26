// F-019 Choose a language (en-US, vi-VN), end to end against the production pages over the sample content (PROD).
// Both languages are in every page (ADR-0012); these tests check what a visitor sees, hears and stores. Pure parts
// (RULE-16, the inline script, the palette's search, dates, the hand-off helpers, backups) are in tests/unit.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { t } from '../../src/modules/copy/index.ts';
import { STORAGE_KEY } from '../../src/modules/personal-data/index.ts';
import { PROD } from './ports.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the copy values per id are checked by t() itself
const vi = (id: Parameters<typeof t>[0], values?: any) => t(id, values, 'vi-VN');
const PAGES = [
  '/',
  '/tools/',
  '/tools/developer/',
  '/about/',
  '/resume/',
  '/now/',
  '/settings/',
  '/privacy/',
  '/terms/',
];

/** Stores a language choice before any page script runs (once per test, so later changes are kept). */
const seedLanguage = (page: Page, language: 'en-US' | 'vi-VN') =>
  page.addInitScript(
    ([key, lang]) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 2,
          favorites: [],
          recents: [],
          preferences: { theme: 'system', language: lang },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, language] as const,
  );
const storedLanguage = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null')?.preferences?.language ?? null, STORAGE_KEY);
const shownLanguage = (page: Page) => page.locator('html').getAttribute('lang');
const headerSwitch = (page: Page) => page.locator('.lang-bar [data-tk-language-switch]');

async function openPalette(page: Page) {
  await page.waitForLoadState('load');
  await page.locator('[data-tk-palette-open]').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.tk-palette')).toHaveAttribute('data-ready', '');
  return dialog;
}

test.describe('F-019 the language showing follows the device until one is chosen', () => {
  test.describe('a device preferring vi, then en', () => {
    test.use({ locale: 'vi-VN' });
    test('F019_AC1 Home is in Vietnamese and declares vi-VN', async ({ page }) => {
      await page.goto(`${PROD}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
      await expect(
        page
          .getByRole('navigation')
          .first()
          .getByRole('link', { name: vi('COPY-nav.tools') }),
      ).toBeVisible();
      await expect(page).toHaveTitle(vi('COPY-meta.homeTitle'));
      expect(await storedLanguage(page)).toBeNull();
    });
  });

  test.describe('a device preferring fr, then de', () => {
    test.use({ locale: 'fr-FR' });
    test('F019_AC2 Home is in English and declares en-US', async ({ page }) => {
      await page.goto(`${PROD}/`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
      await expect(page.getByRole('navigation').first().getByRole('link', { name: 'Tools' })).toBeVisible();
    });
  });
});

test.describe('F-019 switching (English device)', () => {
  test.use({ locale: 'en-US' });

  test('F019_AC3 the header switch changes the Tools page in place: text, filter, scroll and focus stay', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto(`${PROD}/tools/`);
    await page.waitForLoadState('load');
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 7));
    const filter = page.getByRole('searchbox').or(page.locator('#tk-catalog-q')).first();
    await filter.fill('json');
    const results = await page.locator('.tk-toolcard:visible').count();
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const scrolled = await page.evaluate(() => window.scrollY);
    await headerSwitch(page).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi('COPY-catalog.title'));
    await expect(filter).toHaveAttribute('placeholder', vi('COPY-catalog.searchPlaceholder'));
    await expect(page.locator('footer').getByRole('link', { name: vi('COPY-footer.privacy') })).toBeVisible();
    await expect(filter).toHaveValue('json');
    await expect(page.locator('.tk-toolcard:visible')).toHaveCount(results);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    await expect(headerSwitch(page)).toBeFocused();
    expect(await page.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(7);
    expect(await storedLanguage(page)).toBe('vi-VN');
  });

  test('F019_AC4 a stored Vietnamese choice is the first painted screen on any page', async ({ page }) => {
    await seedLanguage(page, 'vi-VN');
    for (const path of ['/', '/about/', '/now/']) {
      await page.goto(`${PROD}${path}`, { waitUntil: 'commit' });
      // The blocking script runs before the body is parsed: the root carries the language from the first paint on.
      await page.waitForSelector('body', { state: 'attached' });
      expect(await shownLanguage(page), path).toBe('vi-VN');
      await page.reload();
      expect(await shownLanguage(page), path).toBe('vi-VN');
    }
  });

  test('F019_AC5 picking Tiếng Việt in settings applies to settings and the shell at once and stores vi-VN', async ({
    page,
  }) => {
    await page.goto(`${PROD}/settings/`);
    await page.waitForLoadState('load');
    await page.getByRole('radio', { name: 'Tiếng Việt' }).check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi('COPY-settings.title'));
    await expect(
      page
        .getByRole('navigation')
        .first()
        .getByRole('link', { name: vi('COPY-nav.home') }),
    ).toBeVisible();
    expect(await storedLanguage(page)).toBe('vi-VN');
  });

  test('F019_AC24 Match my device on an English device shows English and stores no language', async ({ page }) => {
    await seedLanguage(page, 'vi-VN');
    await page.goto(`${PROD}/settings/`);
    await page.waitForLoadState('load');
    await page.getByRole('radio', { name: vi('COPY-language.device') }).check();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    expect(await storedLanguage(page)).toBeNull();
  });

  test('F019_AC6 with Vietnamese showing, the palette action switches to English and closes the palette', async ({
    page,
  }) => {
    await seedLanguage(page, 'vi-VN');
    await page.goto(`${PROD}/about/`);
    const dialog = await openPalette(page);
    await page.keyboard.type('English');
    const action = dialog.getByRole('option', { name: /English/ });
    await expect(action).toBeVisible();
    await action.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(dialog).toBeHidden();
    expect(await storedLanguage(page)).toBe('en-US');
  });

  test('F019_AC9 "dinh dang" with English showing lists JSON Formatter with its English name and summary', async ({
    page,
  }) => {
    await page.goto(`${PROD}/`);
    const dialog = await openPalette(page);
    await page.keyboard.type('dinh dang');
    const option = dialog.getByRole('option', { name: /JSON Formatter/ });
    await expect(option).toBeVisible();
    await expect(option).not.toContainText('Định dạng');
  });

  test('F019_AC19 with Vietnamese showing, "settings" lists Cài đặt; "ngôn ngữ" and "language" list the switch', async ({
    page,
  }) => {
    await seedLanguage(page, 'vi-VN');
    await page.goto(`${PROD}/`);
    const dialog = await openPalette(page);
    const field = dialog.getByRole('combobox');
    await field.fill('settings');
    await expect(dialog.getByRole('option', { name: vi('COPY-nav.settings') })).toBeVisible();
    for (const q of ['ngôn ngữ', 'language']) {
      await field.fill(q);
      await expect(dialog.getByRole('option', { name: /English/ }), q).toBeVisible();
    }
  });

  test('F019_AC21 with Vietnamese showing, the result count is announced in Vietnamese', async ({ page }) => {
    await seedLanguage(page, 'vi-VN');
    await page.goto(`${PROD}/`);
    const dialog = await openPalette(page);
    await dialog.getByRole('combobox').fill('o');
    const n = await dialog.getByRole('option').count();
    expect(n).toBeGreaterThan(1);
    await expect(page.getByTestId('palette-count')).toHaveText(vi('COPY-palette.resultCount', { count: n }));
  });

  test('F019_AC10 the Privacy translation note shows with Vietnamese only', async ({ page }) => {
    await page.goto(`${PROD}/privacy/`);
    await expect(page.getByTestId('policy-translation-note')).toBeHidden();
    await headerSwitch(page).click();
    const note = page.getByTestId('policy-translation-note');
    await expect(note).toBeVisible();
    await expect(note).toHaveText(vi('COPY-policy.translationNote'));
    const title = await page.getByRole('heading', { level: 1 }).boundingBox();
    const box = await note.boundingBox();
    expect(box!.y).toBeGreaterThan(title!.y);
  });

  test('F019_AC22 with storage unavailable the switch lasts for this page only', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('denied', 'SecurityError');
        },
      });
    });
    await page.goto(`${PROD}/`);
    await page.waitForLoadState('load');
    await headerSwitch(page).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await page.goto(`${PROD}/about/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  });

  test('F019_AC20 in the narrow menu, switching keeps the menu open with focus on the switch', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PROD}/`);
    await page.waitForLoadState('load');
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();
    const row = page.locator('#main-menu [data-tk-language-switch]');
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(row).toBeFocused();
  });

  test('F019_AC15 with scripts disabled Home shows only the English text', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: 'vi-VN' });
    const page = await context.newPage();
    await page.goto(`${PROD}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    await expect(page.getByRole('navigation').first().getByRole('link', { name: 'Tools' })).toBeVisible();
    await expect(page.getByRole('navigation').first().getByText(vi('COPY-nav.tools'), { exact: true })).toBeHidden();
    await context.close();
  });
});

test.describe('F-019 Vietnamese on every page', () => {
  test.use({ locale: 'en-US' });

  test('F019_AC17 every portal page has no serious axe issues in Vietnamese; language names are marked', async ({
    page,
  }) => {
    await seedLanguage(page, 'vi-VN');
    for (const path of PAGES) {
      await page.goto(`${PROD}${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${path} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    }
    const sw = headerSwitch(page);
    await expect(sw.locator('[data-to="en-US"]')).toHaveAttribute('lang', 'en-US');
    await expect(sw.locator('[data-to="vi-VN"]')).toHaveAttribute('lang', 'vi-VN');
    await expect(page.getByRole('radio', { name: 'English' })).toHaveCount(1);
    const labels = page.locator('label:has(input[type=radio])');
    await expect(labels.filter({ hasText: 'English' }).locator('[lang="en-US"]')).toHaveCount(1);
    await expect(labels.filter({ hasText: 'Tiếng Việt' }).locator('[lang="vi-VN"]')).toHaveCount(1);
  });

  for (const width of [320, 721])
    test(`F019_AC23 the header fits with no sideways scroll at ${width} px in Vietnamese`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await seedLanguage(page, 'vi-VN');
      for (const path of PAGES) {
        await page.goto(`${PROD}${path}`);
        await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
        expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
        const header = await page.locator('header').first().boundingBox();
        expect(header!.width, path).toBeLessThanOrEqual(width);
      }
    });

  test('F019_AC16 after one online visit, the Now page opens offline in Vietnamese', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'chromium', 'service-worker offline runs use Chromium emulation (SP-4)');
    await seedLanguage(page, 'vi-VN');
    await page.goto(`${PROD}/`);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    const res = await page.goto(`${PROD}/now/`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi('COPY-now.title'));
    await context.setOffline(false);
  });
});
