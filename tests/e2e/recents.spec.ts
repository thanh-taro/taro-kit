// F-006 Track recent tools, end to end. The portal is the fixture build served as https://tarokit.test
// (tests/e2e/support/sites.ts); content is tests/fixtures/content/F005-favorites (fx-01 … fx-26, ft-embedded,
// fx-linked, fx-hidden). Home is built by F-007, so the recents list (MOD-Pages RecentTools, SCR-Home region 5)
// is shown on the tests-only page /__fixtures__/recents/ (tests/fixtures/pages/F006-recents.astro), next to
// static catalog cards; the tool view and settings are the real pages.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PROD } from './ports.ts';
import { PORTAL, serveSites, toolPage } from './support/sites.ts';

const STORAGE_KEY = 'tarokit.personal';
const FIXTURE = `${PORTAL}/__fixtures__/recents/`;
const SETTINGS = `${PORTAL}/settings/`;
const LINKED = 'Fixture linked tool';
const LINKED_URL = 'https://fx-linked.example.com/';

const fx = (n: number) => `fx-${String(n).padStart(2, '0')}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => fx(from + i));
const nameOf = (id: string) =>
  id === 'fx-linked' ? LINKED : id === 'ft-embedded' ? 'Fixture embedded tool' : `Fixture tool ${id.slice(3)}`;

interface Seed {
  /** Newest first. */
  recents?: string[];
  favorites?: string[];
  daysUsed?: string[];
}

/** Stores personal data before the first load only, as if from earlier visits. */
const seed = (page: Page, { recents = [], favorites = [], daysUsed = [] }: Seed) =>
  page.addInitScript(
    ([key, doc]) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          favorites: doc.favorites.map((toolId, i) => ({
            toolId,
            pinnedAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
          })),
          recents: doc.recents.map((toolId, i) => ({
            toolId,
            openedAt: new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString(),
          })),
          preferences: { theme: 'system' },
          daysUsed: doc.daysUsed,
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, { recents, favorites, daysUsed }] as const,
  );

const stored = (page: Page): Promise<{ recents: string[]; daysUsed: string[] }> =>
  page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    return {
      recents: (doc?.recents ?? []).map((r: { toolId: string }) => r.toolId),
      daysUsed: doc?.daysUsed ?? [],
    };
  }, STORAGE_KEY);
const storedRecents = async (page: Page) => (await stored(page)).recents;

const recentsSection = (page: Page) => page.getByRole('region', { name: 'Recently used' });
const recentNames = (page: Page) => recentsSection(page).locator('.tk-toolcard__link').allTextContents();
const catalogLink = (page: Page, id: string) =>
  page.getByTestId('catalog').getByRole('link', { name: nameOf(id), exact: true });

async function openFixture(page: Page, url = FIXTURE) {
  await page.goto(url);
  await page.waitForLoadState('load');
  await expect(page.locator('[data-testid="recents-ready"]')).toBeAttached();
}

/** Clicks a linked tool's card and waits for its new tab; the portal stays where it was. */
async function openLinkedFromCard(page: Page) {
  const before = page.url();
  const [tab] = await Promise.all([page.context().waitForEvent('page'), catalogLink(page, 'fx-linked').click()]);
  await tab.waitForLoadState();
  expect(tab.url()).toBe(LINKED_URL);
  expect(page.url()).toBe(before);
  await tab.close();
}

test.beforeEach(async ({ context }) => {
  await serveSites(context);
});

test.describe('F-006.R1 recording visits', () => {
  test('F006_AC1 a linked tool opened from a card appears first in recents', async ({ page }) => {
    await seed(page, { recents: ['fx-01', 'fx-02'] });
    await openFixture(page);
    await openLinkedFromCard(page);
    expect(await storedRecents(page)).toEqual(['fx-linked', 'fx-01', 'fx-02']);
    await expect.poll(() => recentNames(page)).toEqual([LINKED, nameOf('fx-01'), nameOf('fx-02')]);
  });

  test('F006_AC1 a middle click and a keyboard Enter on a linked card count too', async ({ page }) => {
    await openFixture(page);
    const link = catalogLink(page, 'fx-linked');
    // Headless Chromium opens a middle-clicked link's background tab unreliably, so only the record is awaited.
    await link.click({ button: 'middle' });
    await expect.poll(() => storedRecents(page)).toEqual(['fx-linked']);
    await page.evaluate(() => localStorage.clear());
    await link.focus();
    const [tab2] = await Promise.all([page.context().waitForEvent('page'), page.keyboard.press('Enter')]);
    await tab2.close();
    expect(await storedRecents(page)).toEqual(['fx-linked']);
  });

  test('F006_AC2 an embedded tool appears first in recents when its tool view is shown', async ({ page }) => {
    await seed(page, { recents: ['fx-01'] });
    await page.goto(toolPage('ft-embedded'));
    await expect(page.frameLocator('iframe').locator('#status')).toHaveText('tool loaded');
    await expect.poll(() => storedRecents(page)).toEqual(['ft-embedded', 'fx-01']);
  });

  test('F-006.R1 an embedded tool’s view records the visit even when the tool does not load (offline)', async ({
    page,
    context,
  }) => {
    await context.setOffline(true);
    await page.goto(toolPage('ft-embedded'));
    await expect(page.getByText('Fixture embedded tool needs the internet.', { exact: false })).toBeVisible();
    await expect.poll(() => storedRecents(page)).toEqual(['ft-embedded']);
  });

  test('F006_AC3 visiting a linked tool’s portal address without following the link leaves recents unchanged', async ({
    page,
    context,
  }) => {
    await seed(page, { recents: ['fx-01'] });
    await page.goto(toolPage('fx-linked'));
    await expect(page.getByRole('heading', { name: `${LINKED} lives on its own site. Open it there.` })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await storedRecents(page)).toEqual(['fx-01']);
    // Following the note's link opens the tool's own address, so that visit counts (F-006.R1).
    const link = page.getByRole('main').getByRole('link', { name: 'Open in new tab' });
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.close();
    expect(await storedRecents(page)).toEqual(['fx-linked', 'fx-01']);
  });

  test('F-006.R1 the not-found state records nothing', async ({ page }) => {
    await seed(page, { recents: ['fx-01'] });
    await page.goto(toolPage('does-not-exist'));
    await expect(page.getByRole('heading', { level: 1, name: "I can't find that page" })).toBeVisible();
    expect(await storedRecents(page)).toEqual(['fx-01']);
  });
});

test.describe('F-006.R2 RULE-01 order and limits', () => {
  test('F006_AC4 opening C from recents A, B, C makes the order C, A, B with no duplicate (linked)', async ({
    page,
  }) => {
    await seed(page, { recents: ['fx-01', 'fx-02', 'fx-linked'] });
    await openFixture(page);
    await expect.poll(() => recentNames(page)).toEqual([nameOf('fx-01'), nameOf('fx-02'), LINKED]);
    await openLinkedFromCard(page);
    expect(await storedRecents(page)).toEqual(['fx-linked', 'fx-01', 'fx-02']);
    await expect.poll(() => recentNames(page)).toEqual([LINKED, nameOf('fx-01'), nameOf('fx-02')]);
  });

  test('F006_AC4 opening C from recents A, B, C makes the order C, A, B with no duplicate (embedded)', async ({
    page,
  }) => {
    await seed(page, { recents: ['fx-01', 'fx-02', 'ft-embedded'] });
    await page.goto(toolPage('ft-embedded'));
    await expect.poll(() => storedRecents(page)).toEqual(['ft-embedded', 'fx-01', 'fx-02']);
  });

  test('F006_AC5 with 20 stored recents, a new tool goes first and the oldest entry is gone', async ({ page }) => {
    await seed(page, { recents: range(1, 20) });
    await openFixture(page);
    await openLinkedFromCard(page);
    const recents = await storedRecents(page);
    expect(recents).toHaveLength(20);
    expect(recents[0]).toBe('fx-linked');
    expect(recents).not.toContain(fx(20));
  });

  test('RULE-01 the shown list holds at most 8 and leaves out favorites', async ({ page }) => {
    await seed(page, { recents: range(1, 12), favorites: [fx(2), fx(5)] });
    await openFixture(page);
    await expect.poll(() => recentNames(page)).toEqual([1, 3, 4, 6, 7, 8, 9, 10].map((n) => nameOf(fx(n))));
  });

  test('RULE-01 pinning a recent tool takes it out of the shown recents at once', async ({ page }) => {
    await seed(page, { recents: ['fx-01', 'fx-02'] });
    await openFixture(page);
    await expect.poll(() => recentNames(page)).toEqual([nameOf('fx-01'), nameOf('fx-02')]);
    const card = recentsSection(page)
      .locator('.tk-toolcard')
      .filter({ hasText: nameOf('fx-01') });
    await card.getByRole('button', { name: 'Add to favorites' }).click();
    await expect.poll(() => recentNames(page)).toEqual([nameOf('fx-02')]);
  });
});

test.describe('F-006.R3 R5 persistence and hidden tools', () => {
  test('F006_AC6 after a reload the same recents are shown', async ({ page }) => {
    await seed(page, { recents: ['fx-03'] });
    await openFixture(page);
    await openLinkedFromCard(page);
    await expect.poll(() => recentNames(page)).toEqual([LINKED, nameOf('fx-03')]);
    await page.reload();
    await expect(page.locator('[data-testid="recents-ready"]')).toBeAttached();
    await expect.poll(() => recentNames(page)).toEqual([LINKED, nameOf('fx-03')]);
  });

  test('F006_AC8 a hidden recent tool is not listed, and is listed in its original position once visible', async ({
    page,
  }) => {
    await seed(page, { recents: ['fx-01', 'fx-02', 'fx-03', 'fx-hidden'] });
    // ?hide simulates a later build in which fx-02 is hidden (RULE-06); fx-hidden is hidden in the content.
    await openFixture(page, `${FIXTURE}?hide=fx-02`);
    await expect.poll(() => recentNames(page)).toEqual([nameOf('fx-01'), nameOf('fx-03')]);
    expect(await storedRecents(page)).toEqual(['fx-01', 'fx-02', 'fx-03', 'fx-hidden']);
    await openFixture(page);
    await expect.poll(() => recentNames(page)).toEqual([nameOf('fx-01'), nameOf('fx-02'), nameOf('fx-03')]);
  });

  test('F-007.R3 the recents section is not shown while there are none to show', async ({ page }) => {
    await seed(page, { recents: ['fx-hidden'] });
    await openFixture(page);
    await expect(recentsSection(page)).toHaveCount(0);
  });

  test('NFR-05 recording visits and days makes no request to any other site', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (r) => requests.push(new URL(r.url()).origin));
    await openFixture(page);
    await page.goto(SETTINGS);
    expect(new Set(requests)).toEqual(new Set([PORTAL]));
  });
});

test.describe('F-006.R4 clearing recents in settings', () => {
  const clearButton = (page: Page) => page.getByRole('button', { name: 'Clear recent tools' });
  const dialog = (page: Page) => page.getByRole('alertdialog', { name: 'Clear your recent tools?' });

  test('F006_AC7 confirming clear-recents empties the recents list', async ({ page }) => {
    await seed(page, { recents: ['fx-01', 'fx-02'] });
    await page.goto(SETTINGS);
    await clearButton(page).click();
    await expect(dialog(page)).toBeVisible();
    // Focus moves into the confirmation, on Cancel (SCR-Settings accessibility, design SettingsDialogs).
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await dialog(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(clearButton(page)).toBeFocused();
    expect(await storedRecents(page)).toEqual([]);
    await openFixture(page);
    await expect(recentsSection(page)).toHaveCount(0);
  });

  test('F-006.R4 cancelling, by button or Escape, keeps the recents', async ({ page }) => {
    await seed(page, { recents: ['fx-01'] });
    await page.goto(SETTINGS);
    await clearButton(page).click();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(clearButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    expect(await storedRecents(page)).toEqual(['fx-01']);
  });

  test('F-006.R4 the confirmation is reachable and usable from the keyboard alone', async ({ page }) => {
    await seed(page, { recents: ['fx-01'] });
    await page.goto(SETTINGS);
    await clearButton(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog(page).getByRole('button', { name: 'Confirm' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeHidden();
    expect(await storedRecents(page)).toEqual([]);
  });
});

test.describe('F-006.R6 RULE-13 days used', () => {
  test('F006_AC9 opened on 3 distinct days in the last 14 and on others before, settings shows 3 days used', async ({
    page,
  }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 14, 10, 0));
    await seed(page, { daysUsed: ['2026-10-14', '2026-10-09', '2026-10-01', '2026-09-30', '2026-08-15'] });
    await page.goto(SETTINGS);
    await expect(page.getByText("You've used TaroKit on 3 of the last 14 days")).toBeVisible();
    // The strip shows the same three days and is hidden from assistive technology (the line says it).
    const strip = page.getByTestId('days-strip');
    await expect(strip).toHaveAttribute('aria-hidden', 'true');
    await expect(strip.locator('[data-used]')).toHaveCount(3);
  });

  test('RULE-13 opening any page records today once, as a local date', async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 14, 23, 30));
    await seed(page, { daysUsed: ['2026-10-09', '2026-10-05'] });
    await page.goto(`${PORTAL}/about/`);
    await expect.poll(async () => (await stored(page)).daysUsed).toEqual(['2026-10-14', '2026-10-09', '2026-10-05']);
    await page.goto(SETTINGS);
    expect((await stored(page)).daysUsed).toEqual(['2026-10-14', '2026-10-09', '2026-10-05']);
    await expect(page.getByText("You've used TaroKit on 3 of the last 14 days")).toBeVisible();
  });
});

for (const scheme of ['dark', 'light'] as const)
  test(`NFR-03 settings with the clear-recents confirmation and the recents list have no axe violations (${scheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await seed(page, { recents: ['fx-01', 'fx-linked', 'fx-03'], daysUsed: ['2026-10-01'] });
    await page.goto(SETTINGS);
    await expect(page.getByText(/You've used TaroKit on \d+ of the last 14 days/)).toBeVisible();
    let results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    await page.getByRole('button', { name: 'Clear recent tools' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    await openFixture(page);
    await expect.poll(() => recentNames(page)).toHaveLength(3);
    results = await new AxeBuilder({ page }).include('[data-testid="recents-host"]').analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

test('the production build has no tests-only recents page', async ({ request }) => {
  const res = await request.get(`${PROD}/__fixtures__/recents/`);
  expect(res.status()).toBe(404);
});
