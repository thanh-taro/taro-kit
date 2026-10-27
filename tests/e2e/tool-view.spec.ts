// F-003 Open a tool, end to end through the real tool view (/t/<id>/), its ToolFrame and CMP-ToolHeader, plus
// the theme hand-off through the real frame (F-012.AC5, AC6, AC9, AC10) and unpinning from the real header
// (F-005.AC2). The portal is the fixture build (FX in ports.ts) served as https://tarokit.test with its `_headers`;
// tools are fixture pages on their own origins (tests/e2e/support/sites.ts). Fixture content:
// tests/fixtures/content/F005-favorites (ft-embedded, ft-clipboard, ft-offline, fx-linked, fx-hidden).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Frame, type Page } from '@playwright/test';
import { join } from 'node:path';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { permissionsPolicy } from '../../src/modules/security-policy/index.ts';
import { SLOW_LOAD_MS } from '../../src/modules/tool-host/phase.ts';
import { PORTAL, prefersScheme, serveSites, toolPage, toolUrl, type Sites } from './support/sites.ts';

const STORAGE_KEY = 'tarokit.personal';
const EMBEDDED = 'Fixture embedded tool';
const LINKED = 'Fixture linked tool';
const LINKED_URL = 'https://fx-linked.example.com/';

let sites: Sites;
test.beforeEach(async ({ context }) => {
  sites = await serveSites(context);
});

/** Stores personal data before the first load only, as if from an earlier visit. */
const seed = (
  page: Page,
  doc: { favorites?: string[]; theme?: 'system' | 'light' | 'dark'; language?: 'en-US' | 'vi-VN' },
) =>
  page.addInitScript(
    ([key, favorites, theme, language]) => {
      // Init scripts run in every frame: seed the portal only, never the tool's own storage.
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 2,
          favorites: favorites.map((toolId, i) => ({
            toolId,
            pinnedAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
          })),
          recents: [],
          preferences: language ? { theme, language } : { theme },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, doc.favorites ?? [], doc.theme ?? 'system', doc.language ?? ''] as const,
  );

const header = (page: Page, name = EMBEDDED) => page.getByRole('toolbar', { name: `${name} controls` });
const toolRegion = (page: Page, name = EMBEDDED) => page.getByRole('region', { name: `${name} tool` });
const frameEl = (page: Page) => page.locator('iframe');

async function toolFrame(page: Page, id = 'ft-embedded'): Promise<Frame> {
  await expect(page.frameLocator('iframe').locator('#status')).toHaveText('tool loaded', { useInnerText: true });
  const frame = page.frames().find((f) => f.url().startsWith(toolUrl(id)));
  if (!frame) throw new Error(`no frame for ${id}`);
  return frame;
}

async function openEmbedded(page: Page, id = 'ft-embedded'): Promise<Frame> {
  await page.goto(toolPage(id));
  return toolFrame(page, id);
}

test.describe('F-003 tool view: embedded tools', () => {
  test('F003_AC1 an embedded tool is shown inside the tool view under its header', async ({ page }) => {
    await openEmbedded(page);
    await expect(page).toHaveURL(toolPage('ft-embedded'));
    await expect(page).toHaveTitle(`${EMBEDDED} — TaroKit`);
    const bar = header(page);
    await expect(bar.getByRole('heading', { level: 1, name: EMBEDDED })).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Back' })).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Add to favorites' })).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Open in new tab' })).toBeVisible();
    // The tool fills the region below the header, and the frame is named for it (SCR-ToolView, ADR-0009).
    const frame = frameEl(page);
    await expect(toolRegion(page).locator('iframe')).toHaveAttribute('title', `${EMBEDDED} tool`);
    await expect(frame).toBeVisible();
    const [barBox, frameBox] = [await bar.boundingBox(), await frame.boundingBox()];
    expect(frameBox!.y).toBeGreaterThan(barBox!.y + barBox!.height - 1);
    expect(frameBox!.height).toBeGreaterThan(400);
    // The loading state is gone once the tool has loaded.
    await expect(page.getByText(`Getting ${EMBEDDED} ready…`)).toBeHidden();
  });

  test('SCR-ToolView focus moves to the tool header on entry, and the skip link jumps into the tool', async ({
    page,
  }) => {
    await openEmbedded(page);
    await expect(header(page)).toBeFocused();
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toHaveAttribute('href', '#tool');
    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(toolRegion(page)).toBeFocused();
  });

  test('F003_AC2 F012_AC10 open-in-new-tab opens the tool’s own address, with no theme, in a new tab', async ({
    page,
    context,
  }) => {
    await seed(page, { theme: 'dark' });
    await openEmbedded(page);
    const link = header(page).getByRole('link', { name: 'Open in new tab' });
    await expect(link).toHaveAttribute('href', toolUrl('ft-embedded'));
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe(toolUrl('ft-embedded'));
    expect(new URL(tab.url()).searchParams.has('theme')).toBe(false);
    await expect(page).toHaveURL(toolPage('ft-embedded'));
  });

  test('F003_AC3 a tool with no permissions is refused the clipboard and the portal is unaffected', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'RULE-10: only Chromium can restrict clipboard writes from frames (SP-3)');
    // Grant the user-level permission everywhere, so only the frame's permission set is under test (SP-3).
    for (const origin of [PORTAL, 'https://ft-embedded.tarokit.test', 'https://ft-clipboard.tarokit.test'])
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.goto(`${PORTAL}/t/ft-clipboard/`);
    await toolFrame(page, 'ft-clipboard');
    // The control: the same fixture, granted clipboard-write, can write (the header and frame delegate it).
    await page.frameLocator('iframe').getByRole('button', { name: 'Copy to clipboard' }).click();
    await expect(page.frameLocator('iframe').locator('#copy-result')).toHaveText('ok', { useInnerText: true });
    // The clipboard as the rest of the device sees it (read from another site: the portal refuses clipboard-read).
    const outside = await context.newPage();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://elsewhere.test' });
    await outside.goto('https://elsewhere.test/clipboard');
    await outside.evaluate(() => navigator.clipboard.writeText('written elsewhere'));

    await page.goto(toolPage('ft-embedded'));
    await toolFrame(page);
    await page.frameLocator('iframe').getByRole('button', { name: 'Copy to clipboard' }).click();
    await expect(page.frameLocator('iframe').locator('#copy-result')).toHaveText('NotAllowedError', {
      useInnerText: true,
    });
    await outside.bringToFront();
    expect(await outside.evaluate(() => navigator.clipboard.readText())).toBe('written elsewhere');
    await expect(page).toHaveURL(toolPage('ft-embedded'));
    await expect(header(page)).toBeVisible();
  });

  test('NFR-08 with clipboard-write=(self) only (no tool declares it), an embedded tool is refused and the portal can copy', async ({
    page,
    context,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'RULE-10: only Chromium can restrict clipboard writes from frames (SP-3)');
    // A registry where no tool declares clipboard-write: the header keeps it for the portal page only (ADR-0009).
    const root = join(import.meta.dirname, '../..');
    const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
    const policy = permissionsPolicy(
      registry.allTools.map((t) => ({ ...t, permissions: t.permissions.filter((p) => p !== 'clipboard-write') })),
    );
    expect(policy).toContain('clipboard-write=(self)');
    sites.headers['permissions-policy'] = policy;
    for (const origin of [PORTAL, 'https://ft-embedded.tarokit.test'])
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    await page.goto(toolPage('ft-embedded'));
    await toolFrame(page);
    await page.frameLocator('iframe').getByRole('button', { name: 'Copy to clipboard' }).click();
    await expect(page.frameLocator('iframe').locator('#copy-result')).toHaveText('NotAllowedError', {
      useInnerText: true,
    });
    // The portal's own copy-address (F-004.R5) still works under the same header.
    await page
      .getByRole('banner')
      .getByRole('button', { name: /Search/ })
      .click();
    const palette = page.getByRole('dialog', { name: 'Search TaroKit' });
    await expect(palette.locator('.tk-palette')).toHaveAttribute('data-ready', '');
    await palette.getByRole('combobox').fill('copy');
    await page.keyboard.press('Enter');
    await expect(palette.getByText('Link copied')).toBeVisible();
  });

  test('F003_AC4 an embedded tool that reads the portal’s stored personal data receives nothing', async ({ page }) => {
    await seed(page, { favorites: ['ft-embedded', 'fx-01'], theme: 'dark' });
    const tool = await openEmbedded(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toContain('ft-embedded');
    const seen = await tool.evaluate(() =>
      (window as unknown as { probe: { readPortal(): Record<string, unknown> } }).probe.readPortal(),
    );
    expect(seen).toEqual({
      parentStorage: 'SecurityError',
      topStorage: 'SecurityError',
      parentDocument: 'SecurityError',
      ownStorage: null,
      ownKeys: '',
      cookies: '',
    });
  });

  test('F003_AC5 navigating the tool area to another site is blocked and the portal page stays the same', async ({
    page,
  }) => {
    const tool = await openEmbedded(page);
    await page.evaluate(() => {
      const w = window as unknown as { violations: string[] };
      w.violations = [];
      document.addEventListener('securitypolicyviolation', (e) => w.violations.push(e.effectiveDirective));
    });
    await tool.evaluate(() =>
      (window as unknown as { probe: { navigateArea(u: string): void } }).probe.navigateArea(
        'https://elsewhere.test/x',
      ),
    );
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { violations: string[] }).violations))
      .toContain('frame-src');
    expect(sites.otherRequests).toEqual([]);
    await expect(page).toHaveURL(toolPage('ft-embedded'));
    await expect(header(page)).toBeVisible();
  });

  test('F003_AC5 RULE-10 the tool cannot navigate the portal page, even after a click inside it', async ({ page }) => {
    await openEmbedded(page);
    await page.frameLocator('iframe').getByRole('button', { name: 'Navigate the portal' }).click();
    await page.waitForTimeout(500);
    expect(sites.otherRequests).toEqual([]);
    await expect(page).toHaveURL(toolPage('ft-embedded'));
    await expect(header(page)).toBeVisible();
  });

  test('F003_AC8 after the slow-load threshold the slow hint shows and the tool keeps loading', async ({ page }) => {
    // The page clock runs until the island has started RULE-11's timer, then is paused well before the threshold, so
    // real time on a busy machine can't fire it early: only runFor moves it from there.
    await page.clock.install({ time: new Date(2026, 9, 14, 10, 0) });
    const held = sites.holdTools();
    await page.goto(toolPage('ft-embedded'), { waitUntil: 'domcontentloaded' });
    const loading = toolRegion(page).getByRole('status');
    await expect(loading).toHaveText(`Getting ${EMBEDDED} ready…`, { useInnerText: true });
    await expect(toolRegion(page)).toHaveAttribute('data-slow-since', /^\d+$/);
    const since = Number(await toolRegion(page).getAttribute('data-slow-since'));
    const margin = 5_000;
    await page.clock.pauseAt(since + margin);
    const slow = `${EMBEDDED} is taking its time. You can open it in a new tab instead.`;
    // `since` is read just before the timer is scheduled, so the page clock may have moved by a millisecond in
    // between: the hint is absent at the threshold minus 2 ms and present 1 ms after it.
    await page.clock.runFor(SLOW_LOAD_MS - margin - 2);
    await expect(header(page).getByText(slow)).toBeHidden();
    await page.clock.runFor(3);
    await expect(header(page).getByRole('status').filter({ hasText: slow })).toBeVisible();
    await expect(header(page).getByRole('link', { name: 'Open in new tab' })).toHaveAttribute('data-primary', '');
    // Still loading: the same frame is waiting for the tool, and the loading state stays.
    await expect(frameEl(page)).toHaveCount(1);
    await expect(loading).toHaveText(`Getting ${EMBEDDED} ready…`, { useInnerText: true });
    expect(sites.toolRequests).toHaveLength(1);
    held.release();
    await toolFrame(page);
    await expect(header(page).getByText(slow)).toBeHidden();
    expect(sites.toolRequests.filter((u) => !u.endsWith('/tool.js'))).toHaveLength(1);
  });

  test('F003_AC9 offline, a tool that is not offline-capable shows the offline state, then loads when back online', async ({
    page,
    context,
  }) => {
    await page.goto(toolPage('ft-embedded'));
    await toolFrame(page);
    // Opened while the device is offline (the portal page itself comes from the proxy, like a cached shell).
    await context.setOffline(true);
    sites.toolRequests.length = 0;
    await page.goto(toolPage('ft-embedded'));
    const message = `${EMBEDDED} needs the internet. I'll load it as soon as you're back online.`;
    await expect(page.getByRole('heading', { name: message })).toBeVisible();
    await expect(frameEl(page)).toHaveCount(0);
    expect(sites.toolRequests).toEqual([]);
    // Back online: the tool loads by itself, with no reload of the portal page.
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 7));
    await context.setOffline(false);
    await toolFrame(page);
    await expect(page.getByRole('heading', { name: message })).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(7);
  });

  test('F-003.R6 an offline-capable tool is loaded even while offline', async ({ page, context }) => {
    await page.goto(toolPage('ft-offline'));
    await toolFrame(page, 'ft-offline');
    await context.setOffline(true);
    await page.goto(toolPage('ft-offline'));
    await expect(frameEl(page)).toHaveCount(1);
    await expect(page.getByText('needs the internet')).toHaveCount(0);
  });
});

test.describe('F-003 tool view: linked, unknown and hidden tools', () => {
  test('F003_AC6 F012_AC10 a linked tool opened from a catalog card opens its own address in a new tab', async ({
    page,
    context,
  }) => {
    await seed(page, { theme: 'dark' });
    await page.goto(`${PORTAL}/__fixtures__/favorites/`);
    const card = page.getByTestId('catalog').getByRole('link', { name: LINKED, exact: true });
    await expect(card).toHaveAttribute('href', LINKED_URL);
    const before = page.url();
    const [tab] = await Promise.all([context.waitForEvent('page'), card.click()]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe(LINKED_URL);
    expect(page.url()).toBe(before);
    expect(sites.otherRequests).toEqual([LINKED_URL]);
  });

  test('F003_AC7 F012_AC10 visiting a linked tool’s portal address opens nothing and shows the note with a link', async ({
    page,
    context,
  }) => {
    await seed(page, { theme: 'dark' });
    const opened: string[] = [];
    context.on('page', (p) => opened.push(p.url()));
    await page.goto(toolPage('fx-linked'));
    await page.waitForTimeout(500);
    expect(opened).toEqual([]);
    expect(sites.otherRequests).toEqual([]);
    await expect(frameEl(page)).toHaveCount(0);
    await expect(header(page, LINKED).getByRole('heading', { level: 1, name: LINKED })).toBeVisible();
    await expect(page.getByRole('heading', { name: `${LINKED} lives on its own site. Open it there.` })).toBeVisible();
    const link = page.getByRole('main').getByRole('link', { name: 'Open in new tab' });
    await expect(link).toHaveAttribute('href', LINKED_URL);
    await expect(link).toHaveAttribute('target', '_blank');
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.waitForLoadState();
    expect(tab.url()).toBe(LINKED_URL);
  });

  test('F003_AC10 an unknown id shows the not-found state with a link to the catalog', async ({ page }) => {
    const response = await page.goto(toolPage('does-not-exist'));
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("I can't find that page");
    await expect(page.getByRole('heading', { level: 1, name: "I can't find that page" })).toBeVisible();
    await expect(page.getByText('It may have moved, or I took it down.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse my tools' })).toHaveAttribute('href', '/tools/');
    await expect(frameEl(page)).toHaveCount(0);
  });

  test('F-003.R7 RULE-06 a hidden tool’s address shows the not-found state too', async ({ page }) => {
    const response = await page.goto(toolPage('fx-hidden'));
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: "I can't find that page" })).toBeVisible();
  });

  test('NFR-08 the tool page only allows its own tool in frames, and other pages allow none', async ({ page }) => {
    const csp = async (path: string) => {
      await page.goto(`${PORTAL}${path}`);
      return page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');
    };
    expect(await csp('/t/ft-embedded/')).toMatch(/frame-src https:\/\/ft-embedded\.tarokit\.test(;|$)/);
    expect(await csp('/t/fx-linked/')).toContain("frame-src 'none'");
    expect(await csp('/')).toContain("frame-src 'none'");
    const frame = frameEl(page);
    await page.goto(toolPage('ft-clipboard'));
    await expect(frame).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    await expect(frame).toHaveAttribute('allow', 'clipboard-write');
    await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin');
    expect(sites.headers['permissions-policy']).toContain('clipboard-write=(self "https://ft-clipboard.tarokit.test")');
  });
});

test.describe('F-012 theme hand-off through the real tool frame', () => {
  test('F012_AC5 with the dark theme showing, the embedded tool’s address carries the dark theme', async ({ page }) => {
    await prefersScheme(page, 'dark');
    const tool = await openEmbedded(page);
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('dark');
    expect(await tool.evaluate(() => (window as unknown as { initialTheme: string }).initialTheme)).toBe('dark');
    await expect(frameEl(page)).toHaveAttribute('src', `${toolUrl('ft-embedded')}?theme=dark&lang=en-US`);
  });

  test('F012_AC5 a stored light choice reaches the tool as light', async ({ page }) => {
    await prefersScheme(page, 'dark');
    await seed(page, { theme: 'light' });
    const tool = await openEmbedded(page);
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('light');
  });

  test('F012_AC6 the header toggle reaches the tool without reloading it, and nothing else is sent', async ({
    page,
  }) => {
    await prefersScheme(page, 'dark');
    const tool = await openEmbedded(page);
    await tool.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    const received = () => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
    await expect.poll(received).toEqual([{ type: 'taro:theme', value: 'light' }]);
    expect(await tool.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    expect(await tool.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(42);
  });

  test('F012_AC7 a tool that says ready while the theme changed during its load gets exactly the theme showing', async ({
    page,
  }) => {
    await prefersScheme(page, 'dark');
    const held = sites.holdTools();
    // The held tool may be part of the page's load event (when the island hydrates early), so don't wait for it.
    await page.goto(toolPage('ft-ready'), { waitUntil: 'domcontentloaded' });
    await expect(frameEl(page)).toHaveAttribute('src', `${toolUrl('ft-ready')}?theme=dark&lang=en-US`);
    // The user toggles while the tool is still loading: the message can't reach it yet.
    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    // The portal must show the new theme before the tool asks for it (no stale answer under load).
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    held.release();
    const tool = await toolFrame(page, 'ft-ready');
    const received = () => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
    // The ready answer: the theme showing, then the language showing (F-019.R7).
    const answer = [
      { type: 'taro:theme', value: 'light' },
      { type: 'taro:language', value: 'en-US' },
    ];
    await expect.poll(received).toEqual(answer);
    await page.waitForTimeout(300);
    expect(await received()).toEqual(answer);
    expect(await tool.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  });

  test('F012_AC8 on system, a device switch during the load reaches a ready tool once, and a later one live', async ({
    page,
  }) => {
    await prefersScheme(page, 'dark');
    const held = sites.holdTools();
    // The held tool may be part of the page's load event (when the island hydrates early), so don't wait for it.
    await page.goto(toolPage('ft-ready'), { waitUntil: 'domcontentloaded' });
    await expect(frameEl(page)).toHaveAttribute('src', `${toolUrl('ft-ready')}?theme=dark&lang=en-US`);
    await page.emulateMedia({ colorScheme: 'light' });
    // The media change applies at the next rendering opportunity: wait for it before the tool says ready.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    held.release();
    const tool = await toolFrame(page, 'ft-ready');
    const received = () => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
    await expect.poll(received).toEqual([
      { type: 'taro:theme', value: 'light' },
      { type: 'taro:language', value: 'en-US' },
    ]);
    // Loaded: a later device switch reaches the tool without reloading it.
    await tool.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
    await prefersScheme(page, 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(received).toEqual([
      { type: 'taro:theme', value: 'light' },
      { type: 'taro:language', value: 'en-US' },
      { type: 'taro:theme', value: 'dark' },
    ]);
    expect(await tool.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(1);
  });

  test('F012_AC9 a tool that never says it is ready loads normally with the theme in its address', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    const tool = await openEmbedded(page);
    expect(new URL(tool.url()).searchParams.get('theme')).toBe('light');
    expect(await tool.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await expect(page.getByText(`Getting ${EMBEDDED} ready…`)).toBeHidden();
    await expect(frameEl(page)).toBeVisible();
    await page.waitForTimeout(300);
    expect(await tool.evaluate(() => (window as unknown as { received: unknown[] }).received)).toEqual([]);
  });
});

test.describe('F-019 language hand-off through the real tool frame', () => {
  const lang = 'taro:language';

  test('F019_AC11 with Vietnamese showing, the embedded tool’s address carries vi-VN and the theme showing', async ({
    page,
  }) => {
    await prefersScheme(page, 'dark');
    await seed(page, { language: 'vi-VN' });
    const tool = await openEmbedded(page);
    await expect(frameEl(page)).toHaveAttribute('src', `${toolUrl('ft-embedded')}?theme=dark&lang=vi-VN`);
    expect(await tool.evaluate(() => (window as unknown as { initialLang: string }).initialLang)).toBe('vi-VN');
  });

  test('F019_AC12 switching to English reaches the tool without reloading it, and nothing else is sent', async ({
    page,
  }) => {
    await prefersScheme(page, 'dark');
    await seed(page, { language: 'vi-VN' });
    const tool = await openEmbedded(page);
    await tool.evaluate(() => ((window as unknown as { marker: number }).marker = 42));
    await page.locator('.lang-bar [data-tk-language-switch]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
    const received = () => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
    await expect.poll(received).toEqual([{ type: lang, value: 'en-US' }]);
    expect(await tool.evaluate(() => document.documentElement.lang)).toBe('en-US');
    expect(await tool.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(42);
  });

  test('F019_AC13 a ready tool gets the theme showing and the language showing', async ({ page }) => {
    await prefersScheme(page, 'light');
    await seed(page, { language: 'vi-VN' });
    await page.goto(toolPage('ft-ready'));
    const tool = await toolFrame(page, 'ft-ready');
    const received = () => tool.evaluate(() => (window as unknown as { received: unknown[] }).received);
    await expect.poll(received).toEqual([
      { type: 'taro:theme', value: 'light' },
      { type: lang, value: 'vi-VN' },
    ]);
  });

  test('F019_AC14 with Vietnamese showing, open-in-new-tab and linked tools open addresses with no language', async ({
    page,
    context,
  }) => {
    await seed(page, { language: 'vi-VN' });
    await openEmbedded(page);
    const link = page.locator(`a[target="_blank"][href^="${toolUrl('ft-embedded')}"]`).first();
    await expect(link).toHaveAttribute('href', toolUrl('ft-embedded'));
    const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
    await tab.waitForLoadState();
    expect(new URL(tab.url()).searchParams.has('lang')).toBe(false);
    await page.goto(`${PORTAL}/__fixtures__/favorites/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi-VN');
    await expect(page.getByTestId('catalog').locator(`a[href="${LINKED_URL}"]`).first()).toHaveAttribute(
      'href',
      LINKED_URL,
    );
  });
});

test('F005_AC2 unpinning in the real tool header removes the tool from the home favorites', async ({ page }) => {
  await seed(page, { favorites: ['fx-02', 'ft-embedded'] });
  await openEmbedded(page);
  const toggle = header(page).getByRole('button', { name: 'Remove from favorites' });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(header(page).getByRole('button', { name: 'Add to favorites' })).toHaveAttribute('aria-pressed', 'false');
  // Home favorites (the fixture page's home stand-in) no longer list it.
  await page.goto(`${PORTAL}/__fixtures__/favorites/`);
  const home = page.getByTestId('home');
  await expect(home.getByRole('link', { name: 'Fixture tool 02', exact: true })).toBeVisible();
  await expect(home.getByRole('link', { name: EMBEDDED, exact: true })).toHaveCount(0);
});

test.describe('NFR-03 tool view accessibility', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`NFR-03 embedded, linked and not-found views have no axe violations (${scheme})`, async ({ page }) => {
      await prefersScheme(page, scheme);
      for (const id of ['ft-embedded', 'fx-linked', 'does-not-exist']) {
        await page.goto(toolPage(id));
        if (id === 'ft-embedded') await toolFrame(page);
        const results = await new AxeBuilder({ page }).exclude('iframe').analyze();
        expect(results.violations.map((v) => `${id}: ${v.id}`)).toEqual([]);
      }
    });
  }
});

test.describe('SCR-ToolView narrow (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('SCR-ToolView NFR-09 the shell bar is hidden; back, favorite and open are labeled 44 px icon buttons', async ({
    page,
  }) => {
    await openEmbedded(page);
    // The compact shell bar is hidden; the tool header takes its place (SCR-ToolView layout region 1).
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Switch to (light|dark) theme$/ })).toBeHidden();
    const bar = header(page);
    const actions = [
      bar.getByRole('link', { name: 'Back' }),
      bar.getByRole('button', { name: 'Add to favorites' }),
      bar.getByRole('link', { name: 'Open in new tab' }),
    ];
    for (const action of actions) {
      await expect(action).toBeVisible();
      const box = (await action.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // Icon buttons: the text labels are visually hidden, not removed.
    expect((await actions[0]!.boundingBox())!.width).toBeLessThan(60);
    expect((await actions[2]!.boundingBox())!.width).toBeLessThan(60);
    // The tool fills the rest of the screen, edge to edge.
    const frameBox = (await frameEl(page).boundingBox())!;
    expect(frameBox.width).toBeGreaterThanOrEqual(388);
    expect(frameBox.y).toBeGreaterThanOrEqual((await bar.boundingBox())!.height - 1);
  });
});
