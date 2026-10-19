// QA phase 5 accessibility fixes (.build-my-app/reports/a11y-qa.md), against the real builds:
// - NFR-07 reflow: no page scrolls sideways at 320 px (M1), the tool-view h1 wraps instead of being cut (m3), the
//   what's-new link name is never clipped (m4), and the layout holds when the browser's text size is 20 px (m6).
// - NFR-04 focus is always visible: the tool view's entry and skip targets show a ring (m7).
// - NFR-03 forced colors (WCAG 1.4.1, 1.4.11): the chosen theme (M2), the used days (m1), the selected palette row
//   and the current Settings icon (m2) keep a cue that isn't color alone. Chromium only: it is the engine whose
//   forced-colors emulation Playwright drives.
// - Reduced motion: the loading state keeps its visible cue, the spinner ring and COPY-tool.loading (m8).
import { expect, test, type Page } from '@playwright/test';
import { FX, PROD } from './ports.ts';
import { serveSites, toolPage } from './support/sites.ts';

const PROD_PAGES = [
  '/',
  '/tools/',
  '/tools/developer/',
  '/projects/',
  '/about/',
  '/now/',
  '/settings/',
  '/t/sample-dev/',
  '/t/does-not-exist/',
];
const EMBEDDED = 'Fixture embedded tool';
const STORAGE_KEY = 'tarokit.personal';

/** [scrollWidth, innerWidth] of the page. */
const widths = (page: Page) => page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth] as const);

async function expectNoSidewaysScroll(page: Page, label: string) {
  const [scroll, inner] = await widths(page);
  expect(scroll, `${label}: scrollWidth ${scroll} > innerWidth ${inner}`).toBeLessThanOrEqual(inner);
}

/** The outline a forced-colors user sees: style, width and (forced) color. */
const outline = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor };
    });

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test.describe('NFR-07 reflow at 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('NFR-07 no page scrolls sideways at 320 px, with the narrow menu closed and open', async ({ page }) => {
    for (const path of PROD_PAGES) {
      await page.goto(`${PROD}${path}`);
      await page.waitForLoadState('load');
      await expectNoSidewaysScroll(page, path);
      const menu = page.getByRole('button', { name: 'Menu' });
      if (await menu.isVisible()) {
        await menu.click();
        await expect(menu).toHaveAttribute('aria-expanded', 'true');
        await expectNoSidewaysScroll(page, `${path} (menu open)`);
      }
    }
  });

  test('NFR-07 home with favorites, recents and what’s new does not scroll sideways at 320 px', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-04T10:00:00'));
    await page.addInitScript((key) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      const at = new Date(Date.UTC(2026, 9, 3)).toISOString();
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          favorites: [{ toolId: 'ft-clipboard', pinnedAt: at }],
          recents: [{ toolId: 'fx-01', openedAt: at }],
          preferences: { theme: 'system' },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }, STORAGE_KEY);
    await page.goto(`${FX}/`);
    await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
    await expect(page.locator('[data-tk-whatsnew-ready]')).toBeAttached();
    await expectNoSidewaysScroll(page, 'fixture home');
  });

  test('NFR-07 a what’s-new link name is never clipped at 320 px (it wraps)', async ({ page }) => {
    // ft-clipboard ("Fixture clipboard tool", the longest name) was added on 2026-10-01: new on 2026-10-04.
    await page.clock.setFixedTime(new Date('2026-10-04T10:00:00'));
    await page.goto(`${FX}/`);
    await expect(page.locator('[data-tk-whatsnew-ready]')).toBeAttached();
    const links = page.locator('.tk-whatsnew__link');
    await expect(links.filter({ hasText: 'Fixture clipboard tool' })).toBeVisible();
    for (const link of await links.all()) {
      const [scroll, client] = await link.evaluate((el) => [el.scrollWidth, el.clientWidth]);
      expect(scroll, await link.textContent()).toBeLessThanOrEqual(client);
    }
  });
});

test.describe('NFR-07 SCR-ToolView title on narrow screens', () => {
  for (const width of [390, 320]) {
    test(`NFR-07 the tool-view h1 wraps and is never cut off at ${width} px`, async ({ page, context }) => {
      await serveSites(context);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(toolPage('ft-embedded'));
      const h1 = page.getByRole('heading', { level: 1, name: EMBEDDED });
      await expect(h1).toBeVisible();
      const fit = await h1.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
        ellipsis: getComputedStyle(el).textOverflow === 'ellipsis' && getComputedStyle(el).whiteSpace === 'nowrap',
      }));
      expect(fit.ellipsis).toBe(false);
      expect(fit.scroll).toBeLessThanOrEqual(fit.client);
      await expectNoSidewaysScroll(page, `tool view at ${width}`);
    });
  }
});

test.describe('NFR-04 SCR-ToolView focus is visible', () => {
  test('NFR-04 the tool header shows a focus ring on entry, and the tool region does after the skip link', async ({
    page,
    context,
    browserName,
  }) => {
    await serveSites(context);
    await page.goto(toolPage('ft-embedded'));
    const header = page.getByRole('toolbar', { name: `${EMBEDDED} tool` });
    await expect(header).toBeFocused();
    const entry = await outline(page, '.tk-toolheader');
    expect(entry.style).toBe('solid');
    expect(entry.width).toBeGreaterThanOrEqual(2);
    expect(entry.color).not.toBe(TRANSPARENT);
    // From the keyboard: the skip link (first in the page) moves focus into the tool, and the ring follows.
    await page.locator('body').evaluate((b) => (b.tabIndex = -1));
    await page.locator('body').focus();
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: `${EMBEDDED} tool` })).toBeFocused();
    const skipTarget = await outline(page, '#tool');
    expect(skipTarget.style).toBe('solid');
    expect(skipTarget.width).toBeGreaterThanOrEqual(2);
    expect(skipTarget.color).not.toBe(TRANSPARENT);
  });
});

test.describe('NFR-03 forced colors keep a cue that is not color alone', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'forced-colors emulation is Chromium only');
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
  });

  test('NFR-03 the chosen theme is outlined in forced colors; the other choices are not', async ({ page }) => {
    await page.goto(`${PROD}/settings/`);
    const system = page.getByRole('radio', { name: 'System' });
    await expect(system).toBeEnabled();
    await expect(system).toBeChecked();
    const checked = await outline(page, '.options label:has(input:checked)');
    expect(checked.style).toBe('solid');
    expect(checked.width).toBeGreaterThanOrEqual(2);
    expect(checked.color).not.toBe(TRANSPARENT);
    const other = await outline(page, '.options label:has(input:not(:checked))');
    expect(other.style).toBe('none');
    // The cue follows the choice.
    await page.getByRole('radio', { name: 'Dark' }).check();
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect((await outline(page, '.options label:has(input[value="dark"])')).style).toBe('solid');
    expect((await outline(page, '.options label:has(input[value="system"])')).style).toBe('none');
  });

  test('NFR-03 used days are filled in forced colors, so they differ from unused ones', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 13, 10, 0));
    await page.addInitScript((key) => {
      if (sessionStorage.getItem('seeded')) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          favorites: [],
          recents: [],
          preferences: { theme: 'system' },
          daysUsed: ['2026-10-10', '2026-10-13'],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }, STORAGE_KEY);
    await page.goto(`${PROD}/settings/`);
    await expect(page.getByText("You've used TaroKit on 2 of the last 14 days")).toBeVisible();
    const bg = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    const used = await bg('[data-testid="days-strip"] span[data-used]');
    const unused = await bg('[data-testid="days-strip"] span:not([data-used])');
    expect(used).not.toBe(unused);
    expect(used).not.toBe(TRANSPARENT);
  });

  test('NFR-03 the selected palette row is outlined in forced colors; the others are not', async ({ page }) => {
    await page.goto(`${PROD}/tools/`);
    await page.locator('header [data-tk-palette-open]:visible').first().click();
    const dialog = page.getByRole('dialog', { name: 'Search TaroKit' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('.tk-palette[data-ready]')).toBeAttached();
    await page.keyboard.press('ArrowDown');
    await expect(dialog.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
    const selected = await outline(page, '.tk-palette__option[aria-selected="true"]');
    expect(selected.style).toBe('solid');
    expect(selected.color).not.toBe(TRANSPARENT);
    expect((await outline(page, '.tk-palette__option[aria-selected="false"]')).style).toBe('none');
  });

  test('NFR-03 the current Settings icon in the header is outlined in forced colors', async ({ page }) => {
    await page.goto(`${PROD}/settings/`);
    const current = await outline(page, 'header .settings[aria-current="page"]');
    expect(current.style).toBe('solid');
    expect(current.color).not.toBe(TRANSPARENT);
    await page.goto(`${PROD}/`);
    expect((await outline(page, 'header .settings')).style).toBe('none');
  });
});

test.describe('NFR-07 larger browser text (rem type sizes)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the default font size is set through Chromium CDP');

  test('NFR-07 type follows the browser text size: 15 px body at 16 px, 18.75 px at 20 px, layout still holds', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PROD}/`);
    const body = () => page.evaluate(() => getComputedStyle(document.body).fontSize);
    expect(await body()).toBe('15px');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 20, fixed: 16 } });
    for (const path of PROD_PAGES) {
      await page.goto(`${PROD}${path}`);
      await page.waitForLoadState('load');
      expect(await body()).toBe('18.75px');
      await expectNoSidewaysScroll(page, `${path} at a 20 px root`);
    }
  });
});

test.describe('reduced motion SCR-ToolView loading', () => {
  test('SCR-ToolView under reduced motion the loading state still shows its ring and COPY-tool.loading', async ({
    page,
    context,
  }) => {
    const sites = await serveSites(context);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const held = sites.holdTools();
    await page.goto(toolPage('ft-embedded'), { waitUntil: 'domcontentloaded' });
    const region = page.getByRole('region', { name: `${EMBEDDED} tool` });
    await expect(region.getByRole('status')).toHaveText(`Getting ${EMBEDDED} ready…`);
    const spinner = region.locator('.tk-spinner');
    await expect(spinner).toBeVisible();
    const ring = await spinner.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: parseFloat(s.borderTopWidth), top: s.borderTopColor, side: s.borderLeftColor };
    });
    // A static ring with its accent segment: still a visible "loading" cue without motion.
    expect(ring.width).toBeGreaterThan(0);
    expect(ring.top).not.toBe(ring.side);
    held.release();
  });
});
