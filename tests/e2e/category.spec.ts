// F-016 Browse a category (SCR-Category, SCR-NotFound). Runs against the fixture build on FIXTURES_PORT
// (playwright.config.ts), whose content is tests/fixtures/content/F005-favorites: Media tools holds three visible
// tools (Audio Trimmer, Clip Maker, Image Resizer), Converters holds only a hidden tool, and Developer tools and
// Productivity hold the F-005 tools. The production build (samples) is checked for its sample categories.
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { FX, PROD } from './ports.ts';

// The fixture content is shared by several features' e2e tests, so counts come from its registry, not constants.
const root = join(import.meta.dirname, '../..');
const fixtureRegistry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const visibleIn = (categoryId: string) =>
  fixtureRegistry.categories.find((c) => c.id === categoryId)?.tools.length ?? 0;

const hero = (page: Page) => page.getByTestId('category-hero');
const categoryNav = (page: Page) => page.getByRole('navigation', { name: 'Categories' });
const toolList = (page: Page) => page.getByTestId('category-tools');

/** The computed color of a --tk-* token, normalized by the browser to rgb(). */
const tokenColor = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);

async function expectNotFound(page: Page, path: string) {
  const res = await page.goto(`${FX}${path}`);
  expect(res?.status()).toBe(404);
  // SCR-NotFound content at the same address (SCR-Category, error state).
  await expect(page).toHaveURL(`${FX}${path}`);
  await expect(page).toHaveTitle("I can't find that page");
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("I can't find that page", { useInnerText: true });
  await expect(page.getByText('It may have moved, or I took it down.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse my tools' })).toHaveAttribute('href', '/tools/');
  await expect(hero(page)).toHaveCount(0);
}

test.describe('F-016 category page', () => {
  test('F016_AC1 visiting /tools/media/ shows the Media tools page', async ({ page }) => {
    const res = await page.goto(`${FX}/tools/media/`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle('Media tools — TaroKit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Media tools', { useInnerText: true });
    // SCR-Category region 1: Tools is the current navigation item (a section of it, not the page itself).
    await expect(page.getByRole('navigation').first().getByRole('link', { name: 'Tools' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  for (const scheme of ['dark', 'light'] as const)
    test(`F016_AC2 the hero shows name, icon, tint, intro and "3 tools" (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${FX}/tools/media/`);
      const h = hero(page);
      await expect(h.getByRole('heading', { level: 1, name: 'Media tools' })).toBeVisible();
      // The Media fixture's own icon (content/assets/icons/clapperboard.svg), not another category's.
      await expect(h.locator('.hero-icon svg')).toBeVisible();
      await expect(h.locator('.hero-icon svg path[d^="M20.2 6 3 11"]')).toHaveCount(1);
      await expect(
        categoryNav(page)
          .getByRole('link', { name: /^Media tools/ })
          .locator('svg path[d^="M20.2 6 3 11"]'),
      ).toHaveCount(1);
      await expect(
        categoryNav(page)
          .getByRole('link', { name: /^Developer tools/ })
          .locator('svg path[d^="M20.2 6 3 11"]'),
      ).toHaveCount(0);
      await expect(h.getByText('Fixture intro.')).toBeVisible();
      await expect(h.getByText('3 tools', { exact: true })).toBeVisible();
      // RULE-14: the header uses the category's tint, the mango pair of the current theme.
      await expect(h).toHaveAttribute('data-tint', 'mango');
      expect(await bg(h)).toBe(await tokenColor(page, '--tk-color-cat-mango-bg'));
      expect(await h.locator('.hero-icon').evaluate((el) => getComputedStyle(el).color)).toBe(
        await tokenColor(page, '--tk-color-cat-mango-fg'),
      );
    });

  test('F016_AC2 edge: a category with one visible tool reads "1 tool"', async ({ page }) => {
    await page.goto(`${FX}/tools/productivity/`);
    await expect(hero(page).getByText('1 tool', { exact: true })).toBeVisible();
  });

  test('F016_AC3 "Audio Trimmer" is listed before "Clip Maker", each as a tool card', async ({ page }) => {
    await page.goto(`${FX}/tools/media/`);
    const cards = toolList(page).locator('.tk-toolcard');
    await expect(cards).toHaveCount(3);
    const names = await cards.locator('.tk-toolcard__link').allInnerTexts();
    expect(names).toEqual(['Audio Trimmer', 'Clip Maker', 'Image Resizer']);
    // Each card is shown as in F-002.R2: one link named after the tool, its summary, its category, a favorite toggle.
    const first = cards.first();
    await expect(first.getByRole('link')).toHaveCount(1);
    await expect(first.getByRole('link')).toHaveAccessibleName('Audio Trimmer');
    await expect(first.getByRole('link')).toHaveAttribute('href', '/t/fx-audio-trimmer/');
    await expect(first.getByText('Fixture tool for the category tests.')).toBeVisible();
    await expect(first.getByText('Media tools', { exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Add to favorites' })).toBeVisible();
  });

  test('F016_AC4 the category navigation moves to Developer tools', async ({ page }) => {
    await page.goto(`${FX}/tools/media/`);
    const nav = categoryNav(page);
    // Every visible category, in display order; the current one is marked; empty categories are left out.
    const names = await nav
      .getByRole('link')
      .evaluateAll((links) => links.map((a) => a.getAttribute('aria-label') ?? (a as HTMLElement).innerText));
    expect(names).toEqual([
      `Developer tools, ${visibleIn('developer')} tools`,
      'Media tools, 3 tools',
      'Productivity, 1 tool',
      'All my tools',
    ]);
    await expect(nav.getByRole('link', { name: 'Media tools, 3 tools' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: /^Developer tools/ })).not.toHaveAttribute('aria-current', /.*/);

    await nav.getByRole('link', { name: /^Developer tools/ }).click();
    await expect(page).toHaveURL(`${FX}/tools/developer/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Developer tools', { useInnerText: true });
    await expect(categoryNav(page).getByRole('link', { name: /^Developer tools/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('F016_AC4 link target: "All my tools" goes to the catalog address', async ({ page }) => {
    await page.goto(`${FX}/tools/media/`);
    await expect(categoryNav(page).getByRole('link', { name: 'All my tools' })).toHaveAttribute('href', '/tools/');
  });

  test('F016_AC4 catalog opens: choosing all tools opens the catalog', async ({ page }) => {
    await page.goto(`${FX}/tools/media/`);
    const [res] = await Promise.all([
      page.waitForResponse((r) => new URL(r.url()).pathname === '/tools/'),
      categoryNav(page).getByRole('link', { name: 'All my tools' }).click(),
    ]);
    expect(res.status()).toBe(200);
    await expect(page).toHaveURL(`${FX}/tools/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My tools', { useInnerText: true });
  });

  test('F016_AC4 the category navigation is reachable from the keyboard', async ({ page }) => {
    await page.goto(`${FX}/tools/media/`);
    const link = categoryNav(page).getByRole('link', { name: /^Developer tools/ });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${FX}/tools/developer/`);
  });

  test('F016_AC5 an unknown category shows the not-found state', async ({ page }) => {
    await expectNotFound(page, '/tools/does-not-exist/');
  });

  test('F016_AC6 a category whose tools are all hidden shows the not-found state', async ({ page }) => {
    await expectNotFound(page, '/tools/converters/');
  });

  test('NFR-09 category pills and the all-tools link are 44 px touch targets at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${FX}/tools/media/`);
    for (const link of await categoryNav(page).getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    // No horizontal page scroll: the navigation scrolls on its own.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  for (const scheme of ['dark', 'light'] as const) {
    for (const path of ['/tools/media/', '/tools/does-not-exist/'])
      test(`NFR-03 ${path} has no serious axe issues (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`${FX}${path}`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
  }
});

test.describe('F-016 sample content, production build (PROD)', () => {
  test('F016_AC1 every sample category has a page, with no CSP violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });
    for (const [id, name] of [
      ['developer', 'Developer tools'],
      ['media', 'Media tools'],
      ['converters', 'Converters & calculators'],
      ['productivity', 'Productivity & relax'],
    ]) {
      const res = await page.goto(`${PROD}/tools/${id}/`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name, { useInnerText: true });
      // F-016.R2, RULE-06: the hero count is the number of listed (visible) tools.
      const cards = await toolList(page).locator('.tk-toolcard').count();
      expect(cards).toBeGreaterThan(0);
      await expect(hero(page).locator('.count')).toHaveText(cards === 1 ? '1 tool' : `${cards} tools`, {
        useInnerText: true,
      });
    }
    expect(violations).toEqual([]);
  });
});
