// F-005 Pin favorite tools, end to end on the tests-only fixture page (tests/fixtures/pages/F005-favorites.astro),
// served from its own build on port 4322 (playwright.config.ts). Home, the catalog and the tool view arrive with
// F-007, F-002 and F-003; the fixture page composes the same shared pieces (CMP-ToolCard, CMP-FavoriteToggle,
// MOD-PersonalData) the way those pages will. Fixture content: fx-01 … fx-26 (own, embedded), fx-linked
// (external, linked) and fx-hidden (hidden).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL_ = 'http://localhost:4322/__fixtures__/favorites/';
const STORAGE_KEY = 'tarokit.personal';
const FULL = 'You can keep up to 24 favorites. Unpin one to make room.';
const NOTICE =
  "Your browser isn't letting me save anything right now, so I'll forget your favorites and recents when you leave.";

const fx = (n: number) => `fx-${String(n).padStart(2, '0')}`;
const name = (id: string) => `Fixture tool ${id.slice(3)}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => fx(from + i));

/** Stores these favorites (oldest first) before the first page load only, as if pinned on an earlier visit. */
const seed = (page: Page, ids: string[]) =>
  page.addInitScript(
    ([key, favorites]) => {
      if (sessionStorage.getItem('seeded')) return;
      const doc = {
        schemaVersion: 1,
        favorites: favorites.map((toolId, i) => ({
          toolId,
          pinnedAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
        })),
        recents: [],
        preferences: { theme: 'system' },
        daysUsed: [],
      };
      localStorage.setItem(key, JSON.stringify(doc));
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, ids] as const,
  );

const stored = (page: Page): Promise<string[]> =>
  page.evaluate(
    (key) =>
      (JSON.parse(localStorage.getItem(key) ?? 'null')?.favorites ?? []).map((f: { toolId: string }) => f.toolId),
    STORAGE_KEY,
  );

const home = (page: Page) => page.getByTestId('home');
const homeNames = (page: Page) => home(page).getByRole('link').allTextContents();
const catalogCard = (page: Page, id: string): Locator =>
  page
    .getByTestId('catalog')
    .locator('.tk-toolcard')
    .filter({ has: page.getByRole('link', { name: name(id), exact: true }) });
const toggleIn = (scope: Locator) => scope.locator('.tk-fav__btn');

async function open(page: Page, url = URL_) {
  await page.goto(url);
  await page.waitForLoadState('load');
  // client:idle toggles are enabled once hydrated.
  await expect(toggleIn(page.getByTestId('catalog')).last()).toBeEnabled();
  await expect(toggleIn(page.getByTestId('tool-header'))).toBeEnabled();
}

test.describe('F-005 favorites', () => {
  test('F005_AC1 pinning from a card shows it as a favorite on the card and on home at once', async ({ page }) => {
    await open(page);
    const card = catalogCard(page, 'fx-03');
    const toggle = toggleIn(card);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAccessibleName('Add to favorites');
    expect(await homeNames(page)).toEqual([]);

    const navigations: string[] = [];
    page.on('framenavigated', (f) => navigations.push(f.url()));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveAccessibleName('Remove from favorites');
    await expect(home(page).getByRole('link', { name: name('fx-03'), exact: true })).toBeVisible();
    // The toggle is a separate button above the stretched link: it never opens the tool (CMP-ToolCard).
    expect(navigations).toEqual([]);
    expect(await stored(page)).toEqual(['fx-03']);
  });

  test('F005_AC1 a change made on home shows on the catalog card and the tool header too (R1)', async ({ page }) => {
    await seed(page, ['fx-01']);
    await open(page);
    const header = toggleIn(page.getByTestId('tool-header'));
    await expect(header).toHaveAttribute('aria-pressed', 'true');
    await toggleIn(home(page).locator('.tk-toolcard').first()).click();
    await expect(header).toHaveAttribute('aria-pressed', 'false');
    await expect(toggleIn(catalogCard(page, 'fx-01'))).toHaveAttribute('aria-pressed', 'false');
    expect(await homeNames(page)).toEqual([]);
  });

  test('F005_AC2 unpinning in the tool view removes it from the home favorites', async ({ page }) => {
    await seed(page, ['fx-01', 'fx-02']);
    await open(page);
    expect(await homeNames(page)).toEqual([name('fx-01'), name('fx-02')]);
    const header = toggleIn(page.getByTestId('tool-header'));
    await expect(header).toHaveAccessibleName('Remove from favorites');
    await header.click();
    await expect(header).toHaveAttribute('aria-pressed', 'false');
    await expect(home(page).getByRole('link', { name: name('fx-01'), exact: true })).toHaveCount(0);
    expect(await homeNames(page)).toEqual([name('fx-02')]);
    expect(await stored(page)).toEqual(['fx-02']);
  });

  test('F005_AC3 three favorites come back in the same order after closing and reopening', async ({ context }) => {
    const first = await context.newPage();
    await open(first);
    for (const id of ['fx-05', 'fx-02', 'fx-09']) {
      await toggleIn(catalogCard(first, id)).click();
      await expect(toggleIn(catalogCard(first, id))).toHaveAttribute('aria-pressed', 'true');
    }
    await first.close();

    const again = await context.newPage();
    await open(again);
    expect(await homeNames(again)).toEqual([name('fx-05'), name('fx-02'), name('fx-09')]);
    for (const id of ['fx-05', 'fx-02', 'fx-09'])
      await expect(toggleIn(catalogCard(again, id))).toHaveAttribute('aria-pressed', 'true');
  });

  test('F005_AC4 a 25th visible favorite is refused with the full-favorites message', async ({ page }) => {
    await seed(page, range(1, 24));
    await open(page);
    const toggle = toggleIn(catalogCard(page, 'fx-25'));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const message = catalogCard(page, 'fx-25').getByRole('status');
    await expect(message).toHaveText(FULL);
    await expect(message).toBeVisible();
    await expect(toggle).toHaveAccessibleDescription(FULL);
    expect(await stored(page)).toEqual(range(1, 24));
    expect(await homeNames(page)).toHaveLength(24);
    // Esc on the toggle dismisses the message.
    await toggle.focus();
    await page.keyboard.press('Escape');
    await expect(message).toHaveText('');
    await expect(toggle).not.toHaveAccessibleDescription(FULL);
  });

  test('F005_AC5 a favorite whose tool is hidden is not shown, and reappears when it is visible again', async ({
    page,
  }) => {
    await seed(page, ['fx-01', 'fx-02', 'fx-03']);
    // `?hide=fx-02` stands for a later build in which fx-02 is hidden (RULE-06).
    await open(page, `${URL_}?hide=fx-02`);
    await expect(home(page).getByRole('link')).toHaveCount(2);
    expect(await homeNames(page)).toEqual([name('fx-01'), name('fx-03')]);
    expect(await stored(page)).toEqual(['fx-01', 'fx-02', 'fx-03']);

    await open(page);
    await expect(home(page).getByRole('link')).toHaveCount(3);
    expect(await homeNames(page)).toEqual([name('fx-01'), name('fx-02'), name('fx-03')]);
  });

  test('F005_AC6 with 23 visible and 1 hidden favorite, pinning drops the hidden one from storage', async ({
    page,
  }) => {
    await seed(page, ['fx-hidden', ...range(1, 23)]);
    await open(page);
    expect(await homeNames(page)).toHaveLength(23);
    const toggle = toggleIn(catalogCard(page, 'fx-24'));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await stored(page)).toEqual(range(1, 24));
    await expect(home(page).getByRole('link')).toHaveCount(24);
  });

  test('F005_AC7 with storage unavailable, pinning works for the session and the notice shows', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError');
        },
      });
    });
    await open(page);
    const notice = page.getByRole('status').filter({ hasText: NOTICE });
    await expect(notice).toHaveCount(1);
    await expect(notice).toBeVisible();
    const toggle = toggleIn(catalogCard(page, 'fx-04'));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(home(page).getByRole('link', { name: name('fx-04'), exact: true })).toBeVisible();
    await expect(toggleIn(home(page))).toHaveAttribute('aria-pressed', 'true');
  });

  test('F-005.R5 no storage notice while storage works', async ({ page }) => {
    await open(page);
    await toggleIn(catalogCard(page, 'fx-04')).click();
    await expect(page.getByText(NOTICE)).toHaveCount(0);
  });

  test('INV-05 pinning and unpinning send nothing over the network', async ({ page }) => {
    await open(page);
    const requests: string[] = [];
    page.on('request', (r) => requests.push(r.url()));
    const toggle = toggleIn(catalogCard(page, 'fx-06'));
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(requests).toEqual([]);
  });
});

test.describe('CMP-ToolCard and CMP-FavoriteToggle', () => {
  test('CMP-ToolCard an embedded tool links to its portal address; the card is one link named by the tool', async ({
    page,
  }) => {
    await open(page);
    const card = catalogCard(page, 'fx-01');
    await expect(card.getByRole('link')).toHaveCount(1);
    await expect(card.getByRole('link')).toHaveAttribute('href', '/t/fx-01/');
    await expect(card.getByRole('link')).not.toHaveAttribute('target', /.*/);
    await expect(card.getByText('Developer tools')).toBeVisible();
    await expect(card.getByRole('button')).toHaveCount(1);
  });

  test('CMP-ToolCard a linked tool opens its own address in a new tab and says so (F-003.R4, F-002.R2)', async ({
    page,
  }) => {
    await open(page);
    const link = page.getByTestId('catalog').getByRole('link', { name: 'Fixture linked tool', exact: true });
    await expect(link).toHaveAttribute('href', 'https://fx-linked.example.com/');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAccessibleDescription('Opens in a new tab');
    await expect(page.getByTestId('catalog').getByText('Opens in a new tab')).toBeVisible();
    // Compact: the marker is screen-reader text only.
    const compact = page.getByTestId('compact-linked').getByRole('link');
    await expect(compact).toHaveAccessibleName('Fixture linked tool');
    await expect(compact).toHaveAccessibleDescription('Opens in a new tab');
  });

  test('CMP-ToolCard unavailable cards are dimmed, say they need the internet and stay focusable', async ({ page }) => {
    await open(page);
    const regular = page.getByTestId('unavailable-regular').getByRole('link');
    await expect(regular).toHaveAccessibleDescription('Opens in a new tab Needs the internet');
    const compact = page.getByTestId('unavailable-compact').getByRole('link');
    await expect(compact).toHaveAccessibleDescription('Needs the internet');
    await compact.focus();
    await expect(compact).toBeFocused();
    await expect(page.getByTestId('unavailable-compact').locator('.tk-fav__btn')).toBeVisible();
  });

  test('CMP-FavoriteToggle every toggle has a 44 px target (NFR-09) and is keyboard operable', async ({ page }) => {
    await open(page);
    for (const scope of ['catalog', 'variants', 'tool-header']) {
      const box = await toggleIn(page.getByTestId(scope)).first().boundingBox();
      expect(box?.width).toBe(44);
      expect(box?.height).toBe(44);
    }
    const toggle = toggleIn(catalogCard(page, 'fx-07'));
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  for (const scheme of ['dark', 'light'] as const)
    test(`NFR-03 the fixture page with cards and toggles has no axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seed(page, range(1, 24));
      await open(page);
      await toggleIn(catalogCard(page, 'fx-25')).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
});

test('the production build (port 4321) has no tests-only fixture page', async ({ request }) => {
  const res = await request.get('http://localhost:4321/__fixtures__/favorites/');
  expect(res.status()).toBe(404);
});
