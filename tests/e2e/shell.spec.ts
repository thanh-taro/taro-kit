// CMP-AppShell: the narrow-screen menu, the current page marking, no sideways scroll (NFR-07),
// and the status regions that stay absent until F-011 fills them.
import AxeBuilder from '@axe-core/playwright';
import { devices, expect, test } from '@playwright/test';

const PHONE = { width: 390, height: 844 };

test.describe('CMP-AppShell narrow menu', () => {
  test.use({ viewport: PHONE });

  test('the Menu button opens the navigation, moves focus in, and Esc closes it', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const menu = page.getByRole('button', { name: 'Menu' });
    const tools = page.getByRole('navigation').getByRole('link', { name: 'Tools' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(tools).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(tools).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toBeFocused();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Settings' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeFocused();
    await expect(tools).toBeHidden();
  });

  test('clicking outside or tabbing past the panel closes it', async ({ page, browserName }) => {
    // WebKit's default Tab skips links and buttons; Option+Tab reaches them (adapters/tests.md engine notes).
    const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
    await page.goto('/');
    await page.waitForLoadState('load');
    const menu = page.getByRole('button', { name: 'Menu' });
    await menu.click();
    // Below the open panel, on the page itself.
    await page.mouse.click(PHONE.width / 2, PHONE.height - 20);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toBeFocused();
    // Settings is the panel's last link: five Tabs on, or six with the Résumé item (F-017.R4).
    const links = await page.locator('#main-menu a').count();
    for (let i = 1; i < links; i++) await page.keyboard.press(tab);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Settings' })).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    // After Settings comes the language switch row, the panel's last control (F-019.R2).
    await page.keyboard.press(tab);
    await expect(page.locator('#main-menu [data-tk-language-switch]')).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press(tab);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  test('a tap on a menu link opens that page (touch, iPhone)', async ({ browser, browserName }) => {
    // iOS doesn't focus a tapped link: the focused first link blurs with no next target after the touch ends,
    // and the menu must not close before the tap's click reaches the link (bug 2026-10-27).
    const context = await browser.newContext({
      ...(browserName === 'webkit' ? devices['iPhone 15'] : devices['Pixel 7']),
      baseURL: test.info().project.use.baseURL,
    });
    const page = await context.newPage();
    for (const [name, path] of [
      ['Tools', '/tools/'],
      ['About me', '/about/'],
      ['Settings', '/settings/'],
    ] as const) {
      await page.goto('/');
      await page.waitForLoadState('load');
      const menu = page.getByRole('button', { name: 'Menu' });
      await expect(menu).toBeEnabled();
      await menu.tap();
      const link = page.getByRole('navigation').getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      await link.tap();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    }
    await context.close();
  });

  test('NFR-07 neither the header nor the open menu scrolls sideways at 390 px', async ({ page }) => {
    for (const path of ['/', '/settings/']) {
      await page.goto(path);
      await page.waitForLoadState('load');
      const overflow = () =>
        page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(await overflow()).toBe(0);
      await page.getByRole('button', { name: 'Menu' }).click();
      expect(await overflow()).toBe(0);
      const panel = await page.locator('#main-menu').boundingBox();
      expect(panel && panel.x >= 0 && panel.x + panel.width <= PHONE.width).toBe(true);
    }
  });

  test('the settings link in the menu is marked current on /settings/', async ({ page }) => {
    await page.goto('/settings/');
    await page.waitForLoadState('load');
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('NFR-03 the open menu has no serious axe issues', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.getByRole('button', { name: 'Menu' }).click();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => v.id)).toEqual([]);
  });
});

test.describe('CMP-AppShell wide', () => {
  test('the settings link is marked current on /settings/ and nowhere else', async ({ page }) => {
    await page.goto('/settings/');
    const settings = page.getByRole('banner').getByRole('link', { name: 'Settings' });
    await expect(settings).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.goto('/');
    await expect(settings).not.toHaveAttribute('aria-current', 'page');
  });

  test('the offline indicator and update message are absent until F-011 provides them', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.offline, .update')).toHaveCount(0);
  });
});

// DEP-17 favicon (QA): every page links the brand icon, so browsers never fall back to a missing /favicon.ico.
const ALL_PAGES = [
  '/',
  '/tools/',
  '/tools/developer/',
  '/about/',
  '/now/',
  '/settings/',
  '/t/sample-dev/',
  '/t/does-not-exist/',
];

test('DEP-17 every page links the SVG favicon and its 32 px PNG fallback, and both are served', async ({ page }) => {
  const icoRequests: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).pathname === '/favicon.ico') icoRequests.push(r.url());
  });
  for (const path of ALL_PAGES) {
    await page.goto(path);
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/icons/favicon.svg');
    await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveAttribute('href', '/icons/favicon-32.png');
    await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveAttribute('sizes', '32x32');
  }
  for (const [href, type] of [
    ['/icons/favicon.svg', 'image/svg+xml'],
    ['/icons/favicon-32.png', 'image/png'],
  ]) {
    const res = await page.request.get(href);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain(type);
  }
  expect(icoRequests).toEqual([]);
});
