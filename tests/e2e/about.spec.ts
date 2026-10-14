// F-008 About the Owner (SCR-About). The production build (PROD) renders whatever content/profile.yaml holds, so
// its expectations come from that file's registry. Link behavior runs on the fixture build (FX), whose profile
// (tests/fixtures/content/F005-favorites) has an email link and a website link. The avatar, nickname and
// location variants are covered on fixture profiles in tests/unit/about.test.ts.
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { initials, loadRegistry, paragraphs } from '../../src/modules/content/index.ts';
import { FX, PROD } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const { profile } = loadRegistry({ root, contentDir: join(root, 'content') });
const fxProfile = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') }).profile;
const links = (page: Page) => page.getByRole('region', { name: 'Find me' });

test.describe('F-008 About page', () => {
  test('F008_AC1 shows the full name, nickname, headline, bio and location from the profile', async ({ page }) => {
    const res = await page.goto(`${PROD}/about/`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle('About me — TaroKit');
    // Region 1: the shell marks About me as the current page.
    await expect(page.getByRole('navigation').first().getByRole('link', { name: 'About me' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.name);
    if (profile.nickname) await expect(page.getByText(`aka ${profile.nickname}`)).toBeVisible();
    if (profile.location) await expect(page.getByText(profile.location, { exact: true })).toBeVisible();
    await expect(page.getByText(profile.headline, { exact: true })).toBeVisible();
    // Edge case: each bio paragraph is its own paragraph.
    const bio = paragraphs(profile.bio);
    const article = page.getByRole('article');
    for (const p of bio) await expect(article.locator('p', { hasText: p.split('\n')[0] })).toHaveCount(1);
  });

  test('F008_AC2 the avatar, or without one the initials of the full name, names the person', async ({ page }) => {
    await page.goto(`${PROD}/about/`);
    const portrait = page.getByRole('img', { name: `Portrait of ${profile.name}` });
    await expect(portrait).toBeVisible();
    if (profile.avatar) await expect(portrait).toHaveJSProperty('complete', true);
    else await expect(portrait).toHaveText(initials(profile.name));
  });

  test('F008_AC3 a web link opens in a new tab', async ({ page, context }) => {
    const web = fxProfile.links.find((l) => l.url.startsWith('https://'));
    if (!web) throw new Error('the fixture profile needs a web link');
    await context.route(`${new URL(web.url).origin}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>destination</title>' }),
    );
    await page.goto(`${FX}/about/`);
    const link = links(page).getByRole('link', { name: new RegExp(`^${web.label}.*Opens in a new tab$`) });
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await expect(popup).toHaveURL(web.url);
    await expect(page).toHaveURL(`${FX}/about/`);
  });

  test('F008_AC4 an email link starts a new message to that address', async ({ page }) => {
    const email = fxProfile.links.find((l) => l.url.startsWith('mailto:'));
    if (!email) throw new Error('the fixture profile needs an email link');
    await page.goto(`${FX}/about/`);
    const link = links(page).getByRole('link', { name: new RegExp(`^${email.label}`) });
    // A mailto: address hands the message to the device's mail app, in place: no new tab.
    await expect(link).toHaveAttribute('href', email.url);
    await expect(link).not.toHaveAttribute('target', /.*/);
    await expect(link).toHaveAccessibleName(new RegExp(email.url.slice('mailto:'.length)));
    await expect(link).not.toHaveAccessibleName(/new tab/);
  });

  test('F008_AC5 links to Projects and Now are shown', async ({ page }) => {
    await page.goto(`${PROD}/about/`);
    const main = page.getByRole('main');
    await expect(main.getByText("See what I've built and what I'm up to now.")).toBeVisible();
    await expect(main.getByRole('link', { name: 'Projects', exact: true })).toHaveAttribute('href', '/projects/');
    await expect(main.getByRole('link', { name: 'Now', exact: true })).toHaveAttribute('href', '/now/');
  });

  for (const scheme of ['dark', 'light'] as const)
    for (const [size, viewport] of Object.entries({
      desktop: { width: 1440, height: 900 },
      narrow: { width: 390, height: 844 },
    }))
      test(`NFR-03 /about/ has no serious axe issues and no sideways scroll (${size}, ${scheme})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`${PROD}/about/`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      });
});
