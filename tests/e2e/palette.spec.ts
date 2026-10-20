// F-004 Search with the command palette, end to end on the fixture build served as https://tarokit.test
// (tests/e2e/support/sites.ts), whose content is tests/fixtures/content/F005-favorites. Names and counts come
// from that content's registry, never from constants. The palette is CMP-CommandPalette (MOD-Palette): a
// pre-rendered <dialog> opened by the inline bootstrap, with the Palette island inside (client:idle); tests wait
// for the island's `data-ready` (catalog data and personal data loaded), never for time.
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry, projectPath } from '../../src/modules/content/index.ts';
import { localDate } from '../../src/modules/personal-data/index.ts';
import { PROD } from './ports.ts';
import { PORTAL, serveSites, toolPage, type Sites } from './support/sites.ts';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const STORAGE_KEY = 'tarokit.personal';
const PAGES = ['Home', 'Tools', 'Projects', 'About me', 'Now', 'Settings'];
const tool = (id: string) => registry.visibleTools.find((t) => t.id === id)!;
const linked = registry.visibleTools.find((t) => t.openMode === 'linked')!;
const embedded = registry.visibleTools.find((t) => t.id === 'ft-embedded')!;

let sites: Sites;
test.beforeEach(async ({ context }) => {
  sites = await serveSites(context);
});

/** Stores personal data before the first load only, as if from earlier visits. */
const seed = (
  page: Page,
  { favorites = [], recents = [], theme = 'system' }: { favorites?: string[]; recents?: string[]; theme?: string },
) =>
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
          preferences: { theme: doc.theme },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, { favorites, recents, theme }] as const,
  );

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search TaroKit' });
const field = (page: Page) => dialog(page).getByRole('combobox');
const listbox = (page: Page) => dialog(page).getByRole('listbox');
const group = (page: Page, name: string) => listbox(page).getByRole('group', { name, exact: true });
const optionNames = (page: Page, name: string) =>
  group(page, name)
    .getByRole('option')
    .evaluateAll((els) => els.map((el) => el.querySelector('.tk-palette__name')!.textContent!.replace(/,.*$/, '')));
const groupNames = (page: Page) =>
  listbox(page)
    .locator('.tk-palette__heading')
    .allTextContents()
    .then((t) => t.map((s) => s.trim()));
const activeOption = (page: Page) => dialog(page).locator('[role="option"][aria-selected="true"]');

/** Mod+K as the bootstrap reads the platform: Command on Apple platforms, Control elsewhere (F-004.R1). */
async function mod(page: Page): Promise<'Meta' | 'Control'> {
  const apple = await page.evaluate(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || '');
  });
  return apple ? 'Meta' : 'Control';
}

async function goto(page: Page, path: string) {
  await page.goto(`${PORTAL}${path}`);
  await page.waitForLoadState('load');
}

/** Opens the palette with the shortcut and waits until its island has its data. */
async function openPalette(page: Page) {
  await page.keyboard.press(`${await mod(page)}+k`);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('.tk-palette')).toHaveAttribute('data-ready', '');
}

test.describe('F-004 command palette', () => {
  test('F004_AC1 Mod+K opens the palette with the search field focused, on any portal page', async ({ page }) => {
    for (const path of ['/', '/tools/', '/projects/', '/about/', '/now/', '/settings/', toolPage(embedded.id)]) {
      await goto(page, path.startsWith('http') ? new URL(path).pathname : path);
      await expect(dialog(page)).toBeHidden();
      await page.keyboard.press(`${await mod(page)}+k`);
      await expect(dialog(page)).toBeVisible();
      await expect(field(page)).toBeFocused();
      // A modal dialog: the page behind it is inert (showModal), and it is labelled (CMP-CommandPalette).
      expect(await dialog(page).evaluate((d) => d.matches(':modal'))).toBe(true);
    }
  });

  test('F004_AC2 Escape closes the palette and focus returns to the element focused before', async ({ page }) => {
    await goto(page, '/projects/');
    const before = page.getByRole('link', { name: 'About me' }).first();
    await before.focus();
    await openPalette(page);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(before).toBeFocused();
  });

  test('F-004.R1 a click outside closes the palette and focus returns; the visible search control opens it', async ({
    page,
  }) => {
    await goto(page, '/about/');
    const control = page.getByRole('banner').getByRole('button', { name: /What are you looking for\?/ });
    await expect(control).toContainText(/⌘K|Ctrl K/);
    await control.click();
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
    // From the keyboard (WebKit does not focus a button on click, so focus is placed first).
    await control.focus();
    await page.keyboard.press('Enter');
    await expect(field(page)).toBeFocused();
    await page.mouse.click(5, 5);
    await expect(dialog(page)).toBeHidden();
    await expect(control).toBeFocused();
    // Text typed in one session is gone in the next: every open starts from the empty query.
    await control.click();
    await field(page).fill('json');
    await page.keyboard.press('Escape');
    await control.click();
    await expect(field(page)).toHaveValue('');
  });

  test('F004_AC3 favorites A and B, recents B, C and D: Favorites A, B, then Recents C, D, then Pages', async ({
    page,
  }) => {
    const [a, b, c, d] = ['fx-01', 'fx-02', 'fx-03', 'fx-04'];
    await seed(page, { favorites: [a!, b!], recents: [b!, c!, d!] });
    await goto(page, '/');
    await openPalette(page);
    expect(await groupNames(page)).toEqual(['Favorites', 'Recent', 'Pages']);
    expect(await optionNames(page, 'Favorites')).toEqual([tool(a!).name, tool(b!).name]);
    expect(await optionNames(page, 'Recent')).toEqual([tool(c!).name, tool(d!).name]);
    expect(await optionNames(page, 'Pages')).toEqual(PAGES);
    // The first option is highlighted (CMP-CommandPalette).
    await expect(activeOption(page)).toContainText(tool(a!).name);
  });

  test('F-004.R2 favorites show at most 8 in pin order; hidden tools never show (RULE-06)', async ({ page }) => {
    const favorites = ['fx-hidden', ...Array.from({ length: 10 }, (_, i) => `fx-${String(i + 1).padStart(2, '0')}`)];
    await seed(page, { favorites, recents: ['fx-hidden', 'fx-20'] });
    await goto(page, '/');
    await openPalette(page);
    const shown = favorites.filter((id) => registry.visibleTools.some((t) => t.id === id)).slice(0, 8);
    expect(await optionNames(page, 'Favorites')).toEqual(shown.map((id) => tool(id).name));
    expect(await optionNames(page, 'Recent')).toEqual([tool('fx-20').name]);
  });

  test('F004_AC4 typing "uni" shows the tool under Tools before the project under Projects', async ({ page }) => {
    await goto(page, '/');
    await openPalette(page);
    await field(page).fill('uni');
    expect(await groupNames(page)).toEqual(['Tools', 'Projects']);
    expect(await optionNames(page, 'Tools')).toEqual(['Unit Converter']);
    expect(await optionNames(page, 'Projects')).toEqual([registry.projects.find((p) => p.id === 'unity-game')!.name]);
    await expect(activeOption(page)).toContainText('Unit Converter');
    await expect(page.getByTestId('palette-count')).toHaveText('2 results');
    await expect(field(page)).toHaveAttribute('aria-activedescendant', (await activeOption(page).getAttribute('id'))!);
  });

  test('F004_AC5 "uni", Down, Enter: the project opens on the projects page with its card focused', async ({
    page,
  }) => {
    await goto(page, '/');
    await openPalette(page);
    await field(page).fill('uni');
    await expect(group(page, 'Projects')).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(activeOption(page)).toContainText('Unity Game Jam');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${PORTAL}${projectPath('unity-game')}`);
    await expect(page.locator('li[data-project-id="unity-game"]')).toBeFocused();
    await expect(dialog(page)).toBeHidden();
  });

  test('F-004.R4 the same project again from the projects page focuses its card again', async ({ page }) => {
    await goto(page, projectPath('unity-game'));
    await expect(page.locator('li[data-project-id="unity-game"]')).toBeFocused();
    await openPalette(page);
    await field(page).fill('unity');
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeHidden();
    await expect(page.locator('li[data-project-id="unity-game"]')).toBeFocused();
  });

  test('F-004 edge case: keys pressed before the island is ready are kept, and Enter runs once it is', async ({
    page,
  }) => {
    // Idle time never comes, so only the shortcut can start the island (client:palette hydrates on open).
    await page.addInitScript(() => {
      window.requestIdleCallback = () => 0;
    });
    await goto(page, '/');
    await page.keyboard.press(`${await mod(page)}+k`);
    await expect(field(page)).toBeFocused();
    await page.keyboard.type('settings');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${PORTAL}/settings/`);
  });

  test('F-004.R4 a project already in view gets the focus back even when another element was focused', async ({
    page,
  }) => {
    await goto(page, projectPath('unity-game'));
    const card = page.locator('li[data-project-id="unity-game"]');
    await expect(card).toBeFocused();
    const other = page.getByRole('link', { name: 'About me' }).first();
    await other.focus();
    await openPalette(page);
    await field(page).fill('unity');
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeHidden();
    await expect(card).toBeFocused();
  });

  test('F-004.R1 Mod+Shift+K does not open the palette', async ({ page }) => {
    await goto(page, '/');
    // Key handlers run while the press is dispatched, so the dialog's state is final when it returns.
    await page.keyboard.press(`${await mod(page)}+Shift+K`);
    await expect(page.locator('#tk-palette')).not.toHaveAttribute('open', '');
    // The plain shortcut, pressed the same way, does open it.
    await page.keyboard.press(`${await mod(page)}+k`);
    await expect(dialog(page)).toBeVisible();
  });

  test("F-004.R1 on a phone-sized tool view, the tool header's search button opens the palette", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(toolPage(embedded.id));
    await page.waitForLoadState('load');
    await expect(page.getByRole('banner')).toBeHidden();
    const search = page
      .getByRole('toolbar', { name: `${embedded.name} controls` })
      .getByRole('button', { name: 'Search' });
    const box = (await search.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await search.click();
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
  });

  test('CMP-AppShell at 800 px the full shell shows the search icon button, not the field-like control', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 600 });
    await goto(page, '/');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
    await expect(banner.getByRole('button', { name: /What are you looking for\?/ })).toBeHidden();
    await banner.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('F-004.R4 copy-address shows "Link copied", then the palette closes', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permission is granted through Chromium');
    await context.grantPermissions(['clipboard-write'], { origin: PORTAL });
    await goto(page, '/now/');
    await openPalette(page);
    await field(page).fill('copy link');
    await page.keyboard.press('Enter');
    await expect(dialog(page).getByText('Link copied')).toBeVisible();
    await expect(dialog(page)).toBeHidden();
  });

  test('F-004 edge case: a failed export keeps the palette open and says so', async ({ page }) => {
    await goto(page, '/');
    await openPalette(page);
    // The export code can't load (as when offline before it was cached).
    await page.route('**/_astro/backup.*.js', (route) => route.abort());
    await field(page).fill('export');
    await page.keyboard.press('Enter');
    await expect(dialog(page).getByRole('status').filter({ hasText: "I couldn't save your backup" })).toBeVisible();
    await expect(dialog(page)).toBeVisible();
  });

  test('F-004.R4 results run from the keyboard across groups: a page, an embedded tool, a linked tool', async ({
    page,
  }) => {
    await goto(page, '/');
    await openPalette(page);
    await field(page).fill('settings');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${PORTAL}/settings/`);
    await page.waitForLoadState('load');

    await openPalette(page);
    await field(page).fill(embedded.name);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${PORTAL}${new URL(toolPage(embedded.id)).pathname}`);
    await page.waitForLoadState('load');

    // A linked tool opens its own address in a new tab, the portal stays, and the visit is recorded (F-003.R4).
    await openPalette(page);
    await field(page).fill(linked.name);
    const before = page.url();
    const [tab] = await Promise.all([page.context().waitForEvent('page'), page.keyboard.press('Enter')]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe(linked.url);
    expect(page.url()).toBe(before);
    await expect(dialog(page)).toBeHidden();
    const recents = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').recents.map((r: { toolId: string }) => r.toolId),
      STORAGE_KEY,
    );
    expect(recents[0]).toBe(linked.id);
    expect(sites.otherRequests).toContain(linked.url);
  });

  test('F004_AC6 with the light theme showing, the toggle-theme action shows dark and closes the palette', async ({
    page,
  }) => {
    await seed(page, { theme: 'light' });
    await goto(page, '/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await openPalette(page);
    await field(page).fill('toggle');
    await expect(activeOption(page)).toContainText('Toggle light/dark theme');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(dialog(page)).toBeHidden();
  });

  test('F004_AC7 the export action saves a backup file as in F-013', async ({ page }) => {
    await seed(page, { favorites: ['fx-01'], recents: ['fx-02'], theme: 'dark' });
    await goto(page, '/');
    await openPalette(page);
    await field(page).fill('export');
    await expect(activeOption(page)).toContainText('Export your data');
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    const today = localDate(new Date());
    expect(download.suggestedFilename()).toBe(`tarokit-backup-${today}.json`);
    const file = JSON.parse(readFileSync((await download.path())!, 'utf8'));
    expect(file.format).toBe('tarokit-backup');
    expect(file.data.schemaVersion).toBe(1);
    expect(file.data.favorites.map((f: { toolId: string }) => f.toolId)).toEqual(['fx-01']);
    expect(file.data.recents.map((r: { toolId: string }) => r.toolId)).toEqual(['fx-02']);
    expect(file.data.preferences.theme).toBe('dark');
    await expect(dialog(page)).toBeHidden();
  });

  test("F004_AC8 copy-address on a tool view puts the tool's portal address on the clipboard and confirms", async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'reading the clipboard back needs Chromium permissions');
    // The portal's Permissions-Policy refuses clipboard-read (ADR-0009), so the test reads it back elsewhere.
    const reader = 'https://elsewhere.test';
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: PORTAL });
    await context.grantPermissions(['clipboard-read'], { origin: reader });
    await page.goto(toolPage(embedded.id));
    await page.waitForLoadState('load');
    // The compact shell's search control (the tool view) opens it too.
    await page
      .getByRole('banner')
      .getByRole('button', { name: /Search/ })
      .click();
    await expect(dialog(page).locator('.tk-palette')).toHaveAttribute('data-ready', '');
    await field(page).fill('copy');
    await expect(activeOption(page)).toContainText('Copy link to this page');
    await page.keyboard.press('Enter');
    await expect(dialog(page).getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
    await expect(dialog(page)).toBeHidden();
    const other = await context.newPage();
    await other.goto(`${reader}/`);
    expect(await other.evaluate(() => navigator.clipboard.readText())).toBe(toolPage(embedded.id));
  });

  test('F004_AC9 "zzzz" shows the no-results message with a browse-catalog action', async ({ page }) => {
    await goto(page, '/');
    await openPalette(page);
    await field(page).fill('zzzz');
    await expect(dialog(page).getByText('I couldn\'t find "zzzz".')).toBeVisible();
    await expect(listbox(page)).toHaveCount(0);
    await expect(field(page)).toHaveAttribute('aria-expanded', 'false');
    const browse = dialog(page).getByRole('link', { name: 'Browse all my tools' });
    await browse.click();
    await expect(page).toHaveURL(`${PORTAL}/tools/`);
  });

  test('F-004 edge case: when the catalog data cannot load, pages and actions still work and the palette says so', async ({
    page,
  }) => {
    await page.route('**/data/catalog.*.json', (route) => route.abort());
    await goto(page, '/');
    await openPalette(page);
    await expect(dialog(page).getByRole('status').filter({ hasText: "I couldn't load my tools" })).toBeVisible();
    expect(await groupNames(page)).toEqual(['Pages']);
    await field(page).fill('now');
    expect(await optionNames(page, 'Pages')).toEqual(['Now']);
  });

  test('F-004 edge case: Mod+K inside the embedded tool stays with the tool; the header control still opens it', async ({
    page,
  }) => {
    await page.goto(toolPage(embedded.id));
    const frame = page.frameLocator('iframe');
    await frame.locator('body').click();
    await page.keyboard.press(`${await mod(page)}+k`);
    await expect(dialog(page)).toBeHidden();
    await page
      .getByRole('banner')
      .getByRole('button', { name: /Search/ })
      .click();
    await expect(dialog(page)).toBeVisible();
    await expect(field(page)).toBeFocused();
  });

  test('CMP-CommandPalette touch sheet: on a narrow screen the icon control opens a full-screen sheet; Cancel closes it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goto(page, '/');
    const control = page.getByRole('banner').getByRole('button', { name: 'Search', exact: true });
    await control.click();
    await expect(dialog(page)).toBeVisible();
    const box = (await dialog(page).boundingBox())!;
    expect(box.width).toBe(390);
    await expect(dialog(page).getByText('to move')).toBeHidden();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();
    // Focus returns to the control (placed first: WebKit does not focus a button on click).
    await control.focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(control).toBeFocused();
  });

  for (const scheme of ['dark', 'light'] as const)
    test(`NFR-04 the open palette has no axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seed(page, { favorites: ['fx-01'], recents: ['fx-02'] });
      await goto(page, '/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      await openPalette(page);
      const scan = () => new AxeBuilder({ page }).include('#tk-palette').analyze();
      expect((await scan()).violations).toEqual([]);
      await field(page).fill('json');
      await expect(group(page, 'Tools')).toBeVisible();
      expect((await scan()).violations).toEqual([]);
      await field(page).fill('zzzz');
      await expect(dialog(page).getByText('Browse all my tools')).toBeVisible();
      expect((await scan()).violations).toEqual([]);
    });
});

test.describe('NFR-01 catalog data starts loading with the page (QA perf)', () => {
  test('NFR-01 every page preloads the catalog data file, and the palette uses that one download', async ({
    page,
    browserName,
  }) => {
    const DATA = /\/data\/catalog\.[0-9a-f]+\.json$/;
    const dataRequests: string[] = [];
    page.on('request', (r) => {
      if (DATA.test(new URL(r.url()).pathname)) dataRequests.push(new URL(r.url()).pathname);
    });
    await page.goto(`${PROD}/`);
    const preload = page.locator('head link[rel="preload"][as="fetch"]');
    await expect(preload).toHaveCount(1);
    const href = (await preload.getAttribute('href'))!;
    expect(href).toMatch(DATA);
    // The palette's fetch() is same-origin with credentials: a matching preload needs crossorigin="anonymous".
    await expect(preload).toHaveAttribute('crossorigin', 'anonymous');
    await expect(preload).toHaveAttribute('type', 'application/json');
    await page.locator('header [data-tk-palette-open]:visible').first().click();
    await expect(page.locator('.tk-palette[data-ready]')).toBeAttached();
    await expect(page.locator('.tk-palette[data-failed]')).toHaveCount(0);
    // The preload is the first request for the file, made while the page loads.
    expect(dataRequests[0]).toBe(href);
    // Chromium's fetch() reuses the preload. WebKit asks again (it doesn't match fetch() to an `as=fetch` preload);
    // in production that second request is served from the HTTP cache, since the hashed file is immutable (ADR-0007).
    if (browserName === 'chromium') expect(dataRequests).toEqual([href]);
    for (const path of ['/tools/', '/about/', '/t/sample-dev/', '/t/does-not-exist/']) {
      await page.goto(`${PROD}${path}`);
      await expect(page.locator('head link[rel="preload"][as="fetch"]'), path).toHaveAttribute('href', href);
    }
  });
});
