// F-011 install and work offline, against the real service worker (MOD-Offline, ADR-0004).
// - "One previous online visit" = load a page, then wait for `navigator.serviceWorker.ready` (the worker is active,
//   so its precache is complete). Never a timed wait.
// - Offline = `context.setOffline(true)`. Chromium only: Playwright's WebKit offline emulation fails requests before
//   the service worker sees them, and Firefox does not run here (adapters/tests.md, SP-4); the full-matrix runs
//   cover WebKit by stopping the server.
// - Production content (PROD) for pages and states; the fixture build (FX) for a linked and an offline-capable tool;
//   a versioned copy of dist/ (support/versioned-server.ts) for publishing a new version mid-test.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { FX, PROD } from './ports.ts';
import { startVersionedHost, type VersionedHost } from './support/versioned-server.ts';

const OFFLINE = "You're offline. Tools that need the internet are paused.";
const UPDATE = "I've shipped an update to TaroKit.";
const UNAVAILABLE = 'Needs the internet';
const PROD_TOOLS = ['Sample converter', 'Sample developer tool', 'Sample media tool', 'Sample productivity tool'];

test.skip(({ browserName }) => browserName !== 'chromium', 'service-worker offline runs use Chromium emulation (SP-4)');

/** One online visit: the page loads and the service worker is active with its precache complete. */
async function visitOnline(page: Page, url: string) {
  const res = await page.goto(url);
  expect(res?.ok()).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
}

async function goOffline(context: BrowserContext, page: Page) {
  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
}

const indicator = (page: Page) => page.getByRole('status').filter({ hasText: OFFLINE }).locator('visible=true');
const cardNames = (page: Page, scope = page.locator('main')) => scope.locator('.tk-toolcard__link').allTextContents();

test.describe('F-011 install', () => {
  test('F011_AC1 every page links the manifest, and Chromium finds the portal installable as TaroKit', async ({
    page,
  }) => {
    await visitOnline(page, `${PROD}/`);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    const cdp = await page.context().newCDPSession(page);
    const { errors, data } = await cdp.send('Page.getAppManifest');
    expect(errors).toEqual([]);
    const manifest = JSON.parse(data ?? '{}');
    expect(manifest).toMatchObject({ name: 'TaroKit', short_name: 'TaroKit', display: 'standalone', start_url: '/' });
    // The same check Chromium runs before it offers its own install option (Lighthouse "installable").
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
    for (const icon of manifest.icons as { src: string }[]) {
      const res = await page.request.get(`${PROD}${icon.src}`);
      expect(res.headers()['content-type']).toBe('image/png');
    }
    for (const path of ['/tools/', '/t/sample-dev/', '/t/does-not-exist/']) {
      await page.goto(`${PROD}${path}`);
      await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    }
  });
});

test.describe('F-011 offline after one online visit (production build)', () => {
  test('F011_AC2 offline, the catalog shows every visible tool, and its search and the palette still work', async ({
    page,
    context,
  }) => {
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    const res = await page.goto(`${PROD}/tools/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await cardNames(page)).sort()).toEqual(PROD_TOOLS);
    // The catalog data file is precached, so search runs offline (F-002 islands).
    await expect(page.getByTestId('catalog')).toHaveAttribute('data-ready', '');
    await page.getByRole('searchbox', { name: 'Filter my tools' }).fill('sample media');
    expect(await cardNames(page, page.getByTestId('catalog-results'))).toEqual(['Sample media tool']);
    // The palette loads its index from the same file.
    await page.locator('[data-tk-palette-open]:visible').first().click();
    const dialog = page.getByRole('dialog', { name: 'Search TaroKit' });
    await expect(dialog.locator('.tk-palette')).toHaveAttribute('data-ready', '');
    await dialog.getByRole('combobox').fill('converter');
    await expect(dialog.getByRole('option', { name: /Sample converter/ })).toBeVisible();
  });

  test('F011_AC8 offline, the Media tools category page shows its visible tools', async ({ page, context }) => {
    await visitOnline(page, `${PROD}/tools/`);
    await goOffline(context, page);
    const res = await page.goto(`${PROD}/tools/media/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Media tools');
    expect(await cardNames(page)).toEqual(['Sample media tool']);
  });

  test('F011_AC3 offline, an embedded tool that is not offline-capable shows the offline state', async ({
    page,
    context,
  }) => {
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    const res = await page.goto(`${PROD}/t/sample-dev/`);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: "Sample developer tool needs the internet. I'll load it as soon as you're back online.",
      }),
    ).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  test('F011_AC3 offline, a tool address without its trailing slash still opens the tool view', async ({
    page,
    context,
  }) => {
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    const res = await page.goto(`${PROD}/t/sample-dev`);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('heading', {
        name: "Sample developer tool needs the internet. I'll load it as soon as you're back online.",
      }),
    ).toBeVisible();
    // A category page too, and an unknown address without the slash is still not found.
    expect((await page.goto(`${PROD}/tools/media`))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Media tools');
    expect((await page.goto(`${PROD}/t/does-not-exist`))?.status()).toBe(404);
  });

  test('F011_AC4 offline, an unknown tool address shows the not-found state', async ({ page, context }) => {
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    for (const path of ['/t/does-not-exist/', '/no/such/page/']) {
      const res = await page.goto(`${PROD}${path}`);
      expect(res?.status()).toBe(404);
      await expect(page).toHaveTitle("I can't find that page");
      await expect(page.getByRole('heading', { level: 1, name: "I can't find that page" })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Browse my tools' })).toHaveAttribute('href', '/tools/');
    }
  });

  test('F011_AC5 offline, home shows the quiet offline indicator, also when loaded offline; it clears online', async ({
    page,
    context,
  }) => {
    await visitOnline(page, `${PROD}/`);
    await expect(page.getByText(OFFLINE)).toHaveCount(0);
    await goOffline(context, page);
    await expect(indicator(page)).toBeVisible();
    await page.goto(`${PROD}/`);
    await expect(indicator(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByText(OFFLINE)).toHaveCount(0);
  });

  test('NFR-06 offline, every portal page loads from the precache', async ({ page, context }) => {
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    for (const path of ['/', '/tools/', '/tools/developer/', '/projects/', '/about/', '/now/', '/settings/']) {
      const res = await page.goto(`${PROD}${path}`);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('F-011 the service worker never answers for other origins (tools) and leaves personal data alone', async ({
    page,
  }) => {
    await visitOnline(page, `${PROD}/`);
    const cached = await page.evaluate(async () => {
      const urls: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
      }
      return urls;
    });
    expect(cached.length).toBeGreaterThan(0);
    expect(cached.every((u) => u.startsWith(`${PROD}/`))).toBe(true);
    expect(cached.some((u) => /\/data\/catalog\.[0-9a-f]{10}\.json/.test(u))).toBe(true);
    // Revisioned entries are keyed with `?__WB_REVISION__=…`.
    expect(cached.some((u) => new URL(u).pathname === '/404.html')).toBe(true);
    expect(cached.some((u) => u.includes('/sw.js'))).toBe(false);
  });
});

test.describe('F-011 unavailable tools offline (fixture build: linked and offline-capable tools)', () => {
  const recents = ['fx-linked', 'ft-embedded', 'ft-offline'];
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((ids) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      localStorage.setItem(
        'tarokit.personal',
        JSON.stringify({
          schemaVersion: 1,
          favorites: [],
          recents: ids.map((toolId, i) => ({
            toolId,
            openedAt: new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString(),
          })),
          preferences: { theme: 'system' },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    }, recents);
  });

  test('F011_AC5 offline, home’s cards mark linked and non-offline-capable tools unavailable, not offline-capable ones', async ({
    page,
    context,
  }) => {
    await page.goto(`${FX}/__fixtures__/recents/`);
    const region = page.getByRole('region', { name: 'Recently used' });
    await expect(region.locator('.tk-toolcard')).toHaveCount(3);
    await expect(page.locator('[data-unavailable]')).toHaveCount(0);
    await goOffline(context, page);
    await expect(indicator(page)).toBeVisible();
    const card = (scope: ReturnType<Page['locator']>, name: string) =>
      scope.locator('.tk-toolcard').filter({ has: page.getByRole('link', { name, exact: true }) });
    for (const scope of [region, page.getByTestId('catalog')]) {
      for (const name of ['Fixture linked tool', 'Fixture embedded tool']) {
        await expect(card(scope, name)).toHaveAttribute('data-unavailable', '');
        await expect(card(scope, name).getByText(UNAVAILABLE)).toBeVisible();
        await expect(scope.getByRole('link', { name, exact: true })).toHaveAccessibleDescription(
          new RegExp(UNAVAILABLE),
        );
      }
      await expect(card(scope, 'Fixture offline tool')).not.toHaveAttribute('data-unavailable', '');
      await expect(card(scope, 'Fixture offline tool').getByText(UNAVAILABLE)).toHaveCount(0);
      await expect(
        scope.getByRole('link', { name: 'Fixture offline tool', exact: true }),
      ).not.toHaveAccessibleDescription(new RegExp(UNAVAILABLE));
    }
    // Back online, the marks clear with no reload.
    await context.setOffline(false);
    await expect(page.locator('[data-unavailable]')).toHaveCount(0);
    await expect(page.getByText(UNAVAILABLE).locator('visible=true')).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Fixture embedded tool', exact: true }).first(),
    ).not.toHaveAccessibleDescription(new RegExp(UNAVAILABLE));
  });

  /** Personal data stored before the first load only, replacing this block's recents (its own flag). */
  const seedHome = (page: Page, favorites: string[], recents: string[]) =>
    page.addInitScript(
      ([favs, recs]) => {
        if (sessionStorage.getItem('home-seeded')) return;
        const at = (i: number) => new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString();
        localStorage.setItem(
          'tarokit.personal',
          JSON.stringify({
            schemaVersion: 1,
            favorites: favs.map((toolId, i) => ({ toolId, pinnedAt: at(i) })),
            recents: recs.map((toolId, i) => ({ toolId, openedAt: at(i) })),
            preferences: { theme: 'system' },
            daysUsed: [],
          }),
        );
        sessionStorage.setItem('home-seeded', '1');
      },
      [favorites, recents] as const,
    );
  const homeCard = (page: Page, scope: ReturnType<Page['locator']>, name: string) =>
    scope.locator('.tk-toolcard').filter({ has: page.getByRole('link', { name, exact: true }) });

  test('F011_AC5 offline, the real home’s favorite and recent cards mark tools that need the internet', async ({
    page,
    context,
  }) => {
    // F-007's home on the fixture build (a linked, an embedded and an offline-capable tool). The fixture build has
    // no service worker, so this goes offline in place; loading home offline is the production test below.
    await seedHome(page, ['fx-linked', 'ft-offline'], ['ft-embedded', 'ft-offline']);
    await page.goto(`${FX}/`);
    await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
    const favorites = page.getByRole('region', { name: 'Your favorites' });
    const recents = page.getByRole('region', { name: 'Recently used' });
    await expect(favorites.locator('.tk-toolcard')).toHaveCount(2);
    await expect(recents.locator('.tk-toolcard')).toHaveCount(1);
    await expect(page.locator('main [data-unavailable]')).toHaveCount(0);
    await goOffline(context, page);
    await expect(indicator(page)).toBeVisible();
    await expect(homeCard(page, favorites, 'Fixture linked tool')).toHaveAttribute('data-unavailable', '');
    await expect(homeCard(page, favorites, 'Fixture linked tool').getByText(UNAVAILABLE)).toBeVisible();
    await expect(homeCard(page, favorites, 'Fixture offline tool')).not.toHaveAttribute('data-unavailable', '');
    await expect(homeCard(page, recents, 'Fixture embedded tool')).toHaveAttribute('data-unavailable', '');
    await context.setOffline(false);
    await expect(page.locator('main [data-unavailable]')).toHaveCount(0);
  });

  test('F011_AC5 the real home loaded offline shows its personal sections from device data', async ({
    page,
    context,
  }) => {
    // Production build (with the service worker): every sample tool is embedded and not offline-capable.
    await seedHome(page, ['sample-dev'], ['sample-media']);
    await visitOnline(page, `${PROD}/`);
    await goOffline(context, page);
    await page.reload();
    await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
    await expect(indicator(page)).toBeVisible();
    const favorites = page.getByRole('region', { name: 'Your favorites' });
    await expect(homeCard(page, favorites, 'Sample developer tool')).toHaveAttribute('data-unavailable', '');
    const recents = page.getByRole('region', { name: 'Recently used' });
    await expect(homeCard(page, recents, 'Sample media tool')).toHaveAttribute('data-unavailable', '');
    await expect(page.getByRole('region', { name: 'Browse by category' })).toBeVisible();
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`NFR-03 the offline home has no axe violations (${scheme})`, async ({ page, context }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await seedHome(page, ['sample-dev'], ['sample-media']);
      await visitOnline(page, `${PROD}/`);
      await goOffline(context, page);
      await page.reload();
      await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
      await expect(indicator(page)).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  }

  test('F011_AC5 offline, catalog search results mark tools that need the internet', async ({ page, context }) => {
    await page.goto(`${FX}/tools/`);
    await expect(page.getByTestId('catalog')).toHaveAttribute('data-ready', '');
    await goOffline(context, page);
    await page.getByRole('searchbox', { name: 'Filter my tools' }).fill('fixture');
    const results = page.getByTestId('catalog-results');
    await expect(results.locator('.tk-toolcard').filter({ hasText: 'Fixture linked tool' })).toHaveAttribute(
      'data-unavailable',
      '',
    );
    await expect(results.locator('.tk-toolcard').filter({ hasText: 'Fixture offline tool' })).not.toHaveAttribute(
      'data-unavailable',
      '',
    );
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`NFR-03 offline cards and the offline indicator have no axe violations (${scheme})`, async ({
      page,
      context,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(`${FX}/__fixtures__/recents/`);
      await expect(page.getByRole('region', { name: 'Recently used' }).locator('.tk-toolcard')).toHaveCount(3);
      await goOffline(context, page);
      await expect(indicator(page)).toBeVisible();
      await expect(page.locator('[data-unavailable]').first()).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
});

test.describe('F-011 a new version (versioned host)', () => {
  let host: VersionedHost;
  test.beforeEach(async () => {
    host = await startVersionedHost();
  });
  test.afterEach(async () => {
    await host.close();
  });

  /** Version 1 controls the page; then version 2 is published and the page checks for it on becoming visible. */
  async function publishWhileOpen(page: Page) {
    await visitOnline(page, `${host.origin}/`);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    // MOD-Offline has attached its update checks (visibility, hourly) for this page.
    await expect(page.locator('html')).toHaveAttribute('data-tk-worker', 'registered');
    await page.evaluate(() => ((window as unknown as { tkSamePage: boolean }).tkSamePage = true));
    host.publish();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? null))
      .toBe('installed');
  }

  test('F011_AC6 a published version shows the update message, and the page does not reload by itself', async ({
    page,
  }) => {
    let loads = 0;
    page.on('load', () => loads++);
    await publishWhileOpen(page);
    const message = page.getByRole('status').filter({ hasText: UPDATE }).locator('visible=true');
    await expect(message).toBeVisible();
    await expect(message.getByRole('button', { name: 'Refresh' })).toBeVisible();
    const loadsBefore = loads;
    // The new worker stays waiting: no controller change, no reload, still version 1.
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? null))
      .toBe('installed');
    expect(await page.evaluate(() => (window as unknown as { tkSamePage?: boolean }).tkSamePage)).toBe(true);
    await expect(page.locator('html')).not.toHaveAttribute('data-tk-e2e-version', '2');
    expect(loads).toBe(loadsBefore);
    // Another page of the portal opened now finds the waiting version too, and still shows version 1.
    const other = await page.context().newPage();
    await other.goto(`${host.origin}/tools/`);
    await expect(other.getByRole('status').filter({ hasText: UPDATE }).locator('visible=true')).toBeVisible();
    await expect(other.locator('html')).not.toHaveAttribute('data-tk-e2e-version', '2');
  });

  test('F011_AC7 Refresh loads the new version once, with favorites, recents and theme intact', async ({ page }) => {
    await visitOnline(page, `${host.origin}/tools/`);
    // Personal data, made through the UI: a favorite, a recent and the light theme.
    await page.getByRole('button', { name: 'Add to favorites' }).first().click();
    await page.goto(`${host.origin}/t/sample-dev/`);
    // The quick toggle switches to the opposite of the theme showing (RULE-03); the choice is then stored.
    const toggle = page.getByRole('button', { name: /^Switch to (light|dark) theme$/ });
    const theme = (await toggle.getAttribute('aria-label'))!.includes('light') ? 'light' : 'dark';
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const before = await page.evaluate(() => localStorage.getItem('tarokit.personal'));
    expect(JSON.parse(before ?? '{}')).toMatchObject({
      favorites: [expect.objectContaining({ toolId: expect.any(String) })],
      recents: [expect.objectContaining({ toolId: 'sample-dev' })],
      preferences: { theme },
    });

    await publishWhileOpen(page);
    let loads = 0;
    page.on('load', () => loads++);
    const message = page.getByRole('status').filter({ hasText: UPDATE }).locator('visible=true');
    await message.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-tk-e2e-version', '2');
    // The load event can land after the new page's markup is visible.
    await expect.poll(() => loads).toBe(1);
    await expect(page.getByText(UPDATE)).toHaveCount(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const after = JSON.parse((await page.evaluate(() => localStorage.getItem('tarokit.personal'))) ?? '{}');
    const prev = JSON.parse(before ?? '{}');
    expect(after.favorites).toEqual(prev.favorites);
    expect(after.recents.map((r: { toolId: string }) => r.toolId)).toEqual(
      prev.recents.map((r: { toolId: string }) => r.toolId),
    );
    expect(after.preferences).toEqual(prev.preferences);
    // The favorite shows on the new version's catalog.
    await page.goto(`${host.origin}/tools/`);
    await expect(page.getByRole('button', { name: 'Remove from favorites' }).first()).toBeVisible();
  });

  test('F011_AC7 with the portal open in two windows, Refresh in each loads the new version, and only on its own', async ({
    page,
  }) => {
    await publishWhileOpen(page);
    const other = await page.context().newPage();
    await other.goto(`${host.origin}/tools/`);
    const message = (p: Page) => p.getByRole('status').filter({ hasText: UPDATE }).locator('visible=true');
    await expect(message(other)).toBeVisible();
    await expect(message(page)).toBeVisible();
    await message(page).getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-tk-e2e-version', '2');
    // The other window was not reloaded: it still shows version 1 and the message, until its own refresh.
    await expect
      .poll(() => other.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state))
      .toBe('activated');
    await expect(other.locator('html')).not.toHaveAttribute('data-tk-e2e-version', '2');
    await expect(message(other)).toBeVisible();
    await message(other).getByRole('button', { name: 'Refresh' }).click();
    await expect(other.locator('html')).toHaveAttribute('data-tk-e2e-version', '2');
  });
});
