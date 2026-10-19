// QA phase 5: one end-to-end test per FLOW spec (specs/30-experience/flows/), on the fixture build served as
// https://tarokit.test (tests/e2e/support/sites.ts). Every wait is on state (visible, URL, stored data), never time.
// Content is tests/fixtures/content/F005-favorites; names come from its registry.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { PORTAL, serveSites, toolPage } from './support/sites.ts';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const embedded = registry.visibleTools.find((t) => t.id === 'ft-embedded')!;
const linked = registry.visibleTools.find((t) => t.openMode === 'linked')!;
const STORAGE_KEY = 'tarokit.personal';

const stored = (page: Page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null') as unknown, STORAGE_KEY);
const recentIds = async (page: Page) =>
  ((await stored(page)) as { recents: { toolId: string }[] } | null)?.recents.map((r) => r.toolId) ?? [];

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search TaroKit' });
const field = (page: Page) => dialog(page).getByRole('combobox');

async function shortcut(page: Page) {
  const apple = await page.evaluate(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || '');
  });
  await page.keyboard.press(`${apple ? 'Meta' : 'Control'}+k`);
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('.tk-palette')).toHaveAttribute('data-ready', '');
}

test.describe('FLOW-01 launch a tool from the keyboard', () => {
  test('FLOW-01 shortcut, type, Enter opens an embedded tool and a linked tool, records recents; Escape changes nothing', async ({
    page,
  }) => {
    await serveSites(page.context());
    await page.goto(`${PORTAL}/`);
    await page.waitForLoadState('load');

    // Exit: Escape closes the palette without changes.
    await shortcut(page);
    await field(page).fill(embedded.name);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(page).toHaveURL(`${PORTAL}/`);
    expect(await recentIds(page)).toEqual([]);

    // Embedded: best match highlighted, Enter opens the tool view, a recent is recorded.
    await shortcut(page);
    await field(page).fill(embedded.name);
    await expect(dialog(page).locator('[role="option"][aria-selected="true"]')).toContainText(embedded.name);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${PORTAL}${new URL(toolPage(embedded.id)).pathname}`);
    await expect(page.frameLocator('iframe').locator('#status')).toHaveText('tool loaded');
    await expect.poll(() => recentIds(page)).toEqual([embedded.id]);

    // Linked: opens in a new tab, the portal stays, the visit is recorded first.
    await shortcut(page);
    await field(page).fill(linked.name);
    const before = page.url();
    const [tab] = await Promise.all([page.context().waitForEvent('page'), page.keyboard.press('Enter')]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe(linked.url);
    expect(page.url()).toBe(before);
    await expect.poll(() => recentIds(page)).toEqual([linked.id, embedded.id]);
  });
});

test.describe('FLOW-02 visitor first visit', () => {
  test('FLOW-02 preview data, home invitation, About, Projects, then a tool; a dead link shows not-found', async ({
    page,
    request,
  }) => {
    await serveSites(page.context());
    // Step 1: the preview a link shows is in the served HTML (F-015.R1), read without running scripts.
    const html = await (await request.get(`http://localhost:${process.env.TK_E2E_PORT ?? 4321}/`)).text();
    expect(html).toMatch(/<meta property="og:title" content="[^"]+"/);
    expect(html).toMatch(/<meta property="og:image" content="[^"]+"/);

    // Step 2: home on a first visit: greeting, introduction, explore invitation.
    await page.goto(`${PORTAL}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)$/);
    await expect(page.locator('main .tk-state').locator('visible=true')).toContainText(
      /New here\? These are the tools I've built/,
    );
    await expect(page.getByTestId('home-search')).toBeVisible();

    // Step 3: About, then Projects, by the navigation.
    const nav = page.getByRole('banner').getByRole('navigation');
    await nav.getByRole('link', { name: 'About me' }).first().click();
    await expect(page).toHaveURL(`${PORTAL}/about/`);
    await expect(page.getByRole('main').getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Projects', exact: true }).click();
    await expect(page).toHaveURL(`${PORTAL}/projects/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Things I've built");

    // Step 4: back on home, browse tools and try an embedded one.
    await page.goto(`${PORTAL}/tools/`);
    await page.getByRole('link', { name: embedded.name }).first().click();
    await expect(page).toHaveURL(`${PORTAL}${new URL(toolPage(embedded.id)).pathname}`);
    await expect(page.frameLocator('iframe').locator('#status')).toHaveText('tool loaded');

    // Exit: a dead link leads to not-found with a way to the catalog.
    const res = await page.goto(toolPage('does-not-exist'));
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: "I can't find that page" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse my tools' })).toHaveAttribute('href', '/tools/');
  });
});

test.describe('FLOW-03 move personal data to a new device', () => {
  const DATA = {
    schemaVersion: 1,
    favorites: [{ toolId: 'fx-09', pinnedAt: '2026-09-01T00:00:00.000Z' }],
    recents: [{ toolId: 'fx-08', openedAt: '2026-09-02T00:00:00.000Z' }],
    preferences: { theme: 'dark' },
    daysUsed: ['2026-10-13'],
  };
  const CONFIRM = 'Replace your favorites, recents, theme and days used with the ones in this file?';

  test('FLOW-03 export in one browser context, import and confirm in a fresh one; invalid and cancelled imports change nothing', async ({
    browser,
  }, testInfo) => {
    const now = new Date(2026, 9, 13, 10, 0);
    const open = async (seed?: unknown) => {
      const context = await browser.newContext();
      await serveSites(context);
      const page = await context.newPage();
      await page.clock.setFixedTime(now);
      if (seed)
        await page.addInitScript(
          ([key, text]) => {
            if (window !== window.top || sessionStorage.getItem('seeded')) return;
            localStorage.setItem(key, text);
            sessionStorage.setItem('seeded', '1');
          },
          [STORAGE_KEY, JSON.stringify(seed)] as const,
        );
      await page.goto(`${PORTAL}/settings/`);
      return { context, page };
    };

    // Old device: export.
    const old = await open(DATA);
    const exportButton = old.page.getByRole('button', { name: 'Export your data' });
    await expect(exportButton).toBeEnabled();
    const [download] = await Promise.all([old.page.waitForEvent('download'), exportButton.click()]);
    const file = testInfo.outputPath('moved-backup.json');
    await download.saveAs(file);
    expect(JSON.parse(readFileSync(file, 'utf8')).data).toEqual(DATA);
    await old.context.close();

    // New device: a fresh context holds nothing but today's day.
    const fresh = await open();
    const { page } = fresh;
    const importButton = page.getByRole('button', { name: 'Import from file' });
    const importDialog = page.getByRole('alertdialog', { name: CONFIRM });
    const choose = async (path: string) => {
      await expect(importButton).toBeEnabled();
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), importButton.click()]);
      await chooser.setFiles(path);
    };
    const before = await stored(page);
    expect((before as { favorites: unknown[] } | null)?.favorites ?? []).toEqual([]);

    // Exit: an invalid file leaves data unchanged.
    await choose(join(root, 'tests/fixtures/backups', 'F013_AC2-not-a-backup.json'));
    await expect(page.getByRole('alert')).toContainText("I couldn't import that file because");
    await expect(page.getByRole('alert')).toContainText('Nothing changed.');
    expect(await stored(page)).toEqual(before);

    // Exit: cancel leaves data unchanged.
    await choose(file);
    await expect(importDialog).toBeVisible();
    await importDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(importDialog).toBeHidden();
    expect(await stored(page)).toEqual(before);

    // Step 3: import and confirm; the data is replaced.
    await choose(file);
    await importDialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(importDialog).toBeHidden();
    expect(await stored(page)).toEqual(DATA);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByText("You've used TaroKit on 1 of the last 14 days")).toBeVisible();
    await fresh.context.close();
  });
});
