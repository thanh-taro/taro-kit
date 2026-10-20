// Smoke test: the home page renders, the skip link is the first focusable element,
// no CSP violations, no third-party requests (NFR-05), and axe finds no serious issues in either theme (NFR-03).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Collects CSP violations reported by the page and by the console. */
async function watchCsp(page: Page): Promise<string[]> {
  const violations: string[] = [];
  await page.exposeFunction('__reportCsp', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  page.on('console', (msg) => {
    if (/content security policy|content-security-policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

test.describe('home', () => {
  test('renders SCR-Home inside the app shell, with Home marked in the navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle("TaroKit — Taro's tools and work");
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)$/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Browse by category' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Home' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('the skip link is the first focusable element and moves focus to main', async ({ page, browserName }) => {
    await page.goto('/');
    // WebKit only tabs to links with "Option+Tab" unless the preference is set.
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });

  test('loads with no CSP violations and no third-party requests', async ({ page }) => {
    const violations = await watchCsp(page);
    const foreign: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol !== 'data:') foreign.push(req.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The theme toggle island hydrates on idle; using it exercises the island scripts under the CSP.
    await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
    const csp = await page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("default-src 'self'");
    expect(violations).toEqual([]);
    expect(foreign).toEqual([]);
  });

  test('the theme is set before first paint and the toggle stores the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    // The inline head script applied the stored choice before the island hydrated.
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tarokit.personal') ?? 'null'));
    expect(stored).toMatchObject({ schemaVersion: 1, preferences: { theme: 'light' } });
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe finds no serious or critical issues (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('settings', () => {
  test('SCR-Settings privacy statement covers the device, tools and hosting (COPY-settings.privacy*)', async ({
    page,
  }) => {
    await page.goto('/settings/');
    const privacy = page.getByRole('region', { name: 'Privacy' });
    await expect(privacy.getByText(/stay in this browser/)).toBeVisible();
    await expect(privacy.getByText(/Each tool is its own site/)).toBeVisible();
    await expect(privacy.getByText(/Cloudflare hosts TaroKit/)).toBeVisible();
  });
});
