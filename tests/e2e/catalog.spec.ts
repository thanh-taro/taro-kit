// F-002 Browse the catalog (SCR-Catalog at /tools/). Runs against the fixture build (FX), whose content is
// tests/fixtures/content/F005-favorites: Developer tools (the F-005 tools, JSON Formatter, Base64), Media tools
// (Audio Trimmer, Clip Maker, Image Resizer), Converters (one hidden tool only) and Productivity (one linked tool).
// The production build (PROD) carries the sample categories, including "Converters & calculators".
// Expected names and counts come from the fixture registry, never from constants.
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { FX, PROD } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const byName = (a: string, b: string) => a.localeCompare(b, 'en');
const countText = (n: number) => (n === 1 ? '1 tool' : `${n} tools`);

const search = (page: Page) => page.getByRole('searchbox', { name: 'Filter my tools' });
const groups = (page: Page) => page.getByTestId('catalog-groups');
const results = (page: Page) => page.getByTestId('catalog-results');
const categoryNav = (page: Page) => page.getByRole('navigation', { name: 'Categories' });
const announcer = (page: Page) => page.getByTestId('catalog-count');
const cardNames = (scope: ReturnType<Page['getByTestId']>) => scope.locator('.tk-toolcard__link').allTextContents();

/** Opens the catalog and waits until the search island has hydrated and loaded the catalog data. */
async function openCatalog(page: Page, base = FX) {
  const res = await page.goto(`${base}/tools/`);
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId('catalog')).toHaveAttribute('data-ready', '');
}

test.describe('F-002 catalog', () => {
  test('F002_AC1 tools appear under their category headings, in category order and alphabetically', async ({
    page,
  }) => {
    await openCatalog(page);
    await expect(page).toHaveTitle('Tools — TaroKit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My tools');
    const sections = groups(page).locator('section');
    await expect(sections).toHaveCount(registry.categories.length);
    // The chevron after each heading link is decorative (aria-hidden), so it is left out of the comparison.
    const headings = await sections.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings.map((h) => h.replace('›', '').trim())).toEqual(registry.categories.map((c) => c.name));
    for (const [i, category] of registry.categories.entries()) {
      const names = await sections.nth(i).locator('.tk-toolcard__link').allTextContents();
      expect(names).toEqual(category.tools.map((t) => t.name).sort(byName));
      expect(names.length).toBeGreaterThan(0);
    }
    // The hidden fixture tools are nowhere (RULE-06), and Converters, whose only tool is hidden, has no group.
    await expect(page.getByText('Fixture hidden tool')).toHaveCount(0);
    await expect(groups(page).getByRole('heading', { name: 'Converters' })).toHaveCount(0);
  });

  test('F002_AC2 a linked tool is marked as opening in a new tab, with its category, summary and toggle', async ({
    page,
  }) => {
    await openCatalog(page);
    const linked = registry.visibleTools.find((t) => t.openMode === 'linked')!;
    const card = groups(page).locator('.tk-toolcard').filter({ hasText: linked.name });
    const link = card.getByRole('link', { name: linked.name, exact: true });
    await expect(link).toHaveAttribute('href', linked.url);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAccessibleDescription('Opens in a new tab');
    await expect(card.getByText('Opens in a new tab')).toBeVisible();
    // F-002.R2: name, summary, icon, category and favorite state on every card.
    await expect(card.getByText(linked.summary)).toBeVisible();
    await expect(card.locator('.tk-toolcard__icon')).toBeVisible();
    await expect(card.locator('.tk-toolcard__category')).toHaveText(
      registry.categories.find((c) => c.id === linked.category)!.name,
    );
    await expect(card.getByRole('button', { name: 'Add to favorites' })).toHaveAttribute('aria-pressed', 'false');
    // An embedded tool is not marked.
    const embedded = groups(page).locator('.tk-toolcard').filter({ hasText: 'Audio Trimmer' });
    await expect(embedded.getByText('Opens in a new tab')).toHaveCount(0);
  });

  test('F002_AC3 choosing "Converters & calculators" in the category navigation opens its page', async ({ page }) => {
    await openCatalog(page, PROD);
    const nav = categoryNav(page);
    await nav.getByRole('link', { name: /^Converters & calculators, / }).click();
    await expect(page).toHaveURL(`${PROD}/tools/converters/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Converters & calculators');
  });

  test('F002_AC3 the navigation lists every visible category with its count, in display order', async ({ page }) => {
    await openCatalog(page);
    const labels = await categoryNav(page)
      .getByRole('link')
      .evaluateAll((links) => links.map((a) => a.getAttribute('aria-label')));
    expect(labels).toEqual(registry.categories.map((c) => `${c.name}, ${countText(c.tools.length)}`));
    for (const c of registry.categories)
      await expect(categoryNav(page).getByRole('link', { name: new RegExp(`^${c.name}, `) })).toHaveAttribute(
        'href',
        `/tools/${c.id}/`,
      );
  });

  test('F002_AC4 activating the "Media tools" heading opens the Media tools page', async ({ page }) => {
    await openCatalog(page);
    const heading = groups(page).getByRole('heading', { level: 2, name: 'Media tools' });
    await heading.getByRole('link', { name: 'Media tools' }).click();
    await expect(page).toHaveURL(`${FX}/tools/media/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Media tools');
  });

  test('F002_AC4 every category heading links to its page and works from the keyboard', async ({ page }) => {
    await openCatalog(page);
    for (const c of registry.categories)
      await expect(groups(page).getByRole('heading', { level: 2, name: c.name }).getByRole('link')).toHaveAttribute(
        'href',
        `/tools/${c.id}/`,
      );
    await groups(page).getByRole('heading', { level: 2, name: 'Media tools' }).getByRole('link').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${FX}/tools/media/`);
  });

  test('F002_AC5 typing "json" lists "JSON Formatter" and not "Base64"', async ({ page }) => {
    await openCatalog(page);
    await search(page).pressSequentially('json');
    await expect(results(page)).toBeVisible();
    await expect(groups(page)).toBeHidden();
    const names = await cardNames(results(page));
    expect(names).toContain('JSON Formatter');
    expect(names).not.toContain('Base64');
    await expect(results(page).getByRole('link', { name: 'Base64' })).toHaveCount(0);
  });

  test('F002_AC5 results update as the user types and the grouped list returns when the field is emptied', async ({
    page,
  }) => {
    await openCatalog(page);
    await search(page).pressSequentially('b');
    await expect(results(page).getByRole('link', { name: 'Base64' })).toBeVisible();
    await search(page).pressSequentially('ase6');
    expect(await cardNames(results(page))).toEqual(['Base64']);
    await search(page).fill('');
    await expect(results(page)).toBeHidden();
    await expect(groups(page)).toBeVisible();
    await expect(announcer(page)).toHaveText(countText(registry.visibleTools.length));
  });

  test('F002_AC6 matches from two categories are one ranked list, each with its category label', async ({ page }) => {
    await openCatalog(page);
    await search(page).fill('image');
    const cards = results(page).locator('.tk-toolcard');
    await expect(cards).toHaveCount(2);
    // RULE-05: Image Resizer matches by name prefix, Base64 only in its summary.
    expect(await cardNames(results(page))).toEqual(['Image Resizer', 'Base64']);
    expect(await cards.locator('.tk-toolcard__category').allTextContents()).toEqual(['Media tools', 'Developer tools']);
    // The count is announced politely after filtering (SCR-Catalog accessibility).
    await expect(announcer(page)).toHaveAttribute('aria-live', 'polite');
    await expect(announcer(page)).toHaveText('2 tools');
    // Ignores case and diacritics.
    await search(page).fill('ÍMAGE');
    expect(await cardNames(results(page))).toEqual(['Image Resizer', 'Base64']);
  });

  test('F002_AC6 a favorite comes first among equally good matches, from the next keystroke', async ({ page }) => {
    await openCatalog(page);
    await search(page).fill('fixture tool 0');
    const firstTwo = async () => (await cardNames(results(page))).slice(0, 2);
    expect(await firstTwo()).toEqual(['Fixture tool 01', 'Fixture tool 02']);
    // Pin "Fixture tool 02" from its result card: the list does not move under the pointer...
    const toggle = results(page)
      .locator('.tk-toolcard')
      .filter({ hasText: 'Fixture tool 02' })
      .getByRole('button', { name: 'Add to favorites' });
    await toggle.click();
    await expect(
      results(page).locator('.tk-toolcard').filter({ hasText: 'Fixture tool 02' }).getByRole('button'),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(await firstTwo()).toEqual(['Fixture tool 01', 'Fixture tool 02']);
    // ...and the next keystroke ranks the favorite first (RULE-05 tie-break).
    await search(page).press('End');
    await search(page).press('Space');
    expect(await firstTwo()).toEqual(['Fixture tool 02', 'Fixture tool 01']);
  });

  test('F002_AC7 no matches shows the no-results message and the clear-search action', async ({ page }) => {
    await openCatalog(page);
    await search(page).fill('pdf');
    await expect(
      page.getByRole('heading', { level: 2, name: `I don't have anything matching "pdf" yet.` }),
    ).toBeVisible();
    await expect(announcer(page)).toHaveText('0 tools');
    await expect(groups(page)).toBeHidden();
    // The category navigation stays (design CatalogStatesDesktop, no results).
    await expect(categoryNav(page)).toBeVisible();
    const clear = page.getByRole('button', { name: 'Clear search' });
    await expect(clear).toBeVisible();
    await clear.click();
    await expect(search(page)).toHaveValue('');
    await expect(search(page)).toBeFocused();
    await expect(groups(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear search' })).toHaveCount(0);
  });

  test('F002_AC8 with no visible tools the empty state is shown', async ({ page }) => {
    await page.goto(`${FX}/__fixtures__/catalog-empty/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My tools');
    await expect(
      page.getByRole('heading', { level: 2, name: "I'm still building my first tools. Check back soon." }),
    ).toBeVisible();
    await expect(categoryNav(page)).toHaveCount(0);
    await expect(page.locator('.tk-toolcard')).toHaveCount(0);
    // Nothing to search: no search field, so typing can never replace the empty state.
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await page.keyboard.type('json');
    await expect(
      page.getByRole('heading', { level: 2, name: "I'm still building my first tools. Check back soon." }),
    ).toBeVisible();
  });

  test('F-002 edge case: when the catalog data cannot load, the field is disabled with the reason and every tool stays listed', async ({
    page,
  }) => {
    await page.route(/\/data\/catalog\.[0-9a-f]+\.json$/, (route) => route.abort());
    await page.goto(`${FX}/tools/`);
    await expect(page.getByTestId('catalog')).toHaveAttribute('data-failed', '');
    await expect(search(page)).toBeDisabled();
    const reason =
      "I couldn't load my search just now. Every tool is still listed below; reload the page to try again.";
    await expect(search(page)).toHaveAccessibleDescription(reason);
    await expect(page.getByRole('status').filter({ hasText: reason })).toBeVisible();
    await expect(groups(page)).toBeVisible();
    await expect(groups(page).locator('.tk-toolcard')).toHaveCount(registry.visibleTools.length);
  });

  test('NFR-09 search field, category pills and heading links are 44 px targets at 390 px, with no sideways scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCatalog(page);
    const targets = [
      search(page),
      ...(await categoryNav(page).getByRole('link').all()),
      ...(await groups(page).getByRole('heading', { level: 2 }).getByRole('link').all()),
    ];
    for (const target of targets) expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await search(page).fill('pdf');
    expect((await page.getByRole('button', { name: 'Clear search' }).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });

  test('PRN-02 the search field and the results are reachable from the keyboard', async ({ page, browserName }) => {
    // WebKit's default Tab skips links and buttons; Option+Tab reaches them (adapters/tests.md engine notes).
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await openCatalog(page);
    await search(page).focus();
    await page.keyboard.type('json');
    // Reading order: the search field, the category navigation (region 3), then the results.
    for (let i = 0; i <= registry.categories.length; i++) await page.keyboard.press(tab);
    await expect(results(page).getByRole('link', { name: 'JSON Formatter' })).toBeFocused();
  });

  for (const scheme of ['dark', 'light'] as const)
    test(`NFR-03 the catalog has no serious axe issues in each state (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const check = async (state: string) => {
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const res = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${state} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
          [],
        );
      };
      await openCatalog(page);
      await check('default');
      await search(page).fill('image');
      await expect(results(page)).toBeVisible();
      await check('results');
      await search(page).fill('pdf');
      await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
      await check('no-results');
      await page.goto(`${FX}/__fixtures__/catalog-empty/`);
      await check('empty');
    });
});

test.describe('F-002 production build (samples)', () => {
  test('F002_AC5 search works on the static build from the hashed catalog data, with no CSP violations', async ({
    page,
  }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });
    const data = page.waitForResponse((r) => /^\/data\/catalog\.[0-9a-f]{10}\.json$/.test(new URL(r.url()).pathname));
    await openCatalog(page, PROD);
    expect((await data).status()).toBe(200);
    await search(page).fill('sample media');
    expect(await cardNames(results(page))).toEqual(['Sample media tool']);
    // RULE-06: the hidden production entries never reach the search.
    await search(page).fill('hidden');
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
    expect(violations).toEqual([]);
  });
});
