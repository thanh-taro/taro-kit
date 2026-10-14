// F-009 Showcase projects (SCR-Projects). The listed states run on the tests-only page /__fixtures__/projects/
// (fixture build, port 4322), which renders the same ProjectsView as /projects/ from
// tests/fixtures/content/F009-projects: six visible projects from 2024 to 2026 and one hidden project.
// The production build (port 4321) has only a hidden sample project, so /projects/ shows the empty state.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FX, PROD } from './ports.ts';

const LIST = `${FX}/__fixtures__/projects/`;
const cards = (page: Page) => page.getByTestId('projects').getByRole('listitem');
const card = (page: Page, id: string) => page.locator(`li[id="${id}"]`);

/** Every request to example.com (the fixture projects' links) gets a tiny page, so nothing leaves the machine. */
async function stubLinks(page: Page) {
  await page
    .context()
    .route('https://example.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>project site</title>' }),
    );
}

test.describe('F-009 projects page', () => {
  test('F009_AC1 the 2026 project is listed first, newest year first then by name', async ({ page }) => {
    await page.goto(LIST);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Things I've built");
    const names = await cards(page).getByRole('heading', { level: 2 }).allTextContents();
    expect(names).toEqual([
      'Pocket Budget',
      'JsonCrack Clone',
      'Tiny Synth',
      'Recipe Box',
      'Study Buddy Bot',
      'Unity Game Jam',
    ]);
    await expect(cards(page).first()).toContainText('2026');
    await expect(cards(page).last()).toContainText('2024');
  });

  test('F009_AC2 a hidden project is not listed', async ({ page }) => {
    await page.goto(LIST);
    await expect(cards(page)).toHaveCount(6);
    await expect(page.getByText('Secret Fixture Game')).toHaveCount(0);
    await expect(card(page, 'secret-game')).toHaveCount(0);
  });

  test("F009_AC3 activating either of a project's two links opens it in a new tab", async ({ page, context }) => {
    await stubLinks(page);
    await page.goto(LIST);
    const pocket = card(page, 'pocket-budget');
    for (const [name, url] of [
      ['Live site', 'https://example.com/pocket-budget'],
      ['Source', 'https://example.com/pocket-budget/source'],
    ] as const) {
      const link = pocket.getByRole('link', { name });
      await expect(link).toHaveAccessibleDescription('Opens in a new tab');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      const [popup] = await Promise.all([context.waitForEvent('page'), link.click()]);
      await popup.waitForLoadState();
      expect(popup.url()).toBe(url);
      // No opener: the project's site cannot reach back into the portal.
      expect(await popup.evaluate(() => window.opener)).toBeNull();
      await popup.close();
      await expect(page).toHaveURL(LIST);
    }
  });

  test('F009_AC4 with no visible projects the page shows the empty state', async ({ page }) => {
    const res = await page.goto(`${PROD}/projects/`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle('Projects — TaroKit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Things I've built");
    await expect(page.getByText("I'm putting my projects together. Check back soon.")).toBeVisible();
    await expect(page.getByTestId('projects')).toHaveCount(0);
    // The sample project is hidden, so it appears nowhere (RULE-06), not even its image.
    await expect(page.getByText('Sample project')).toHaveCount(0);
    // Shell region 1: Projects is the current page.
    await expect(page.getByRole('navigation').first().getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('F009_AC5 opening "unity-game"\'s address scrolls its card into view and focuses it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(LIST);
    await expect(card(page, 'unity-game')).not.toBeInViewport();
    // A fresh load at the address, not a same-page hash change (covered below).
    await page.goto('about:blank');
    await page.goto(`${LIST}#unity-game`);
    await expect(card(page, 'unity-game')).toBeFocused();
    await expect(card(page, 'unity-game')).toBeInViewport();
  });

  test('F009_AC5 a changed address in the same page also scrolls to and focuses the card', async ({ page }) => {
    await page.goto(LIST);
    await page.evaluate(() => (location.hash = '#unity-game'));
    await expect(card(page, 'unity-game')).toBeFocused();
    await expect(card(page, 'unity-game')).toBeInViewport();
    await page.evaluate(() => (location.hash = '#pocket-budget'));
    await expect(card(page, 'pocket-budget')).toBeFocused();
  });

  for (const id of ['does-not-exist', 'secret-game'])
    test(`F-009 edge case: the address of an unknown or hidden project (${id}) opens the page at the top`, async ({
      page,
    }) => {
      await page.goto(`${LIST}#${id}`);
      await expect(cards(page).first()).toBeVisible();
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await expect(page.locator('li:focus')).toHaveCount(0);
    });

  test("F-009 edge case: a project without an image shows its name's monogram; one with an image shows it", async ({
    page,
  }) => {
    await page.goto(LIST);
    await expect(card(page, 'unity-game').getByText('UG', { exact: true })).toBeVisible();
    const img = card(page, 'pocket-budget').getByRole('img', { name: 'Screenshot of Pocket Budget' });
    await expect(img).toBeVisible();
    expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  });

  for (const scheme of ['dark', 'light'] as const)
    for (const url of [LIST, `${LIST}#unity-game`, `${PROD}/projects/`])
      test(`NFR-03 ${url.replace(/^http:\/\/[^/]+/, '')} has no serious axe issues (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(url);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });

  test('NFR-05 the production projects page loads with no CSP violations', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (/content security policy/i.test(msg.text())) violations.push(msg.text());
    });
    await page.goto(`${PROD}/projects/#anything`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(violations).toEqual([]);
  });
});
