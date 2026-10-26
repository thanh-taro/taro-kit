// F-007 Home dashboard (SCR-Home) in the built portal.
// - The production build (PROD, tests/fixtures/content/samples) for the introduction, the category row and what's
//   new on the sample content.
// - The fixture build (FX, tests/fixtures/content/F005-favorites: fx-01 … fx-26, ft-*, fx-linked; fx-hidden is
//   hidden) for favorites, recents and the first-visit states, since it has enough tools; its home is the real page.
// - What's new needs tools with chosen dates, so F007_AC6–AC8 use the tests-only page /__fixtures__/whats-new/,
//   which renders the real WhatsNew island over fixed sets of tools (tests/fixtures/pages/F007-whats-new.astro).
// The page clock is set before loading wherever the date or time matters. The islands mark themselves ready
// (`data-tk-home-ready`, `data-tk-whatsnew-ready`); tests wait on those, never on time.
import { pick } from '../../src/modules/language/languages.ts';
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { devices, expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { whatsNew } from '../../src/modules/pages/whats-new.ts';
import { FX, PROD, SAMPLES_CONTENT } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const prod = loadRegistry({ root, contentDir: join(root, SAMPLES_CONTENT) });
const fixture = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });

const STORAGE_KEY = 'tarokit.personal';
const FAVORITES = 'Your favorites';
const RECENTS = 'Recently used';
const CATEGORIES = 'Browse by category';
const WHATS_NEW = 'Fresh from my workbench';
const INVITE =
  /^New here\? These are the tools I've built for work and life\. Browse them, or press (⌘K|Ctrl K) and I'll find anything for you\.$/;
const INVITE_TOUCH =
  "New here? These are the tools I've built for work and life. Browse them, or tap search and I'll find anything for you.";

const fx = (n: number) => `fx-${String(n).padStart(2, '0')}`;
const nameOf = (id: string) => fixture.toolById(id)?.name ?? id;

/** Stores personal data before the first load only, as if from earlier visits. */
const seed = (page: Page, { favorites = [] as string[], recents = [] as string[] }) =>
  page.addInitScript(
    ([key, doc]) => {
      if (window !== window.top || sessionStorage.getItem('seeded')) return;
      const at = (i: number) => new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString();
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          favorites: doc.favorites.map((toolId, i) => ({ toolId, pinnedAt: at(i) })),
          recents: doc.recents.map((toolId, i) => ({ toolId, openedAt: at(i) })),
          preferences: { theme: 'system' },
          daysUsed: [],
        }),
      );
      sessionStorage.setItem('seeded', '1');
    },
    [STORAGE_KEY, { favorites, recents }] as const,
  );

async function openHome(page: Page, base = FX) {
  await page.goto(`${base}/`);
  await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
  await expect(page.locator('[data-tk-whatsnew-ready]')).toBeAttached();
}

/**
 * Waits until every font face the laid-out page uses has loaded, so a later font swap can't move what is measured.
 * Not `document.fonts.ready`: WebKit doesn't resolve it while a held script keeps the load event pending.
 */
const fontsLoaded = (page: Page) =>
  page.evaluate(async () => {
    document.body.getBoundingClientRect(); // layout starts the loads of the faces in use
    await Promise.all([...document.fonts].filter((f) => f.status === 'loading').map((f) => f.loaded));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const cardNames = (page: Page, name: string) => region(page, name).locator('.tk-toolcard__link').allTextContents();
const invitation = (page: Page) => page.locator('main .tk-state').locator('visible=true');
const searchEntry = (page: Page) => page.getByTestId('home-search');

test.describe('F-007 greeting and time', () => {
  test('F007_AC1 at 08:30 home shows the morning greeting and the current date and time', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-13T08:30:00') });
    await page.goto(`${PROD}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good morning');
    const when = page.getByTestId('home-clock');
    await expect(when).toContainText('8:30');
    await expect(when).toContainText(/Tue/);
    await expect(when).toContainText(/Oct/);
    await expect(when).toContainText(/13/);
    await expect(when.locator('time')).toHaveAttribute('datetime', '2026-10-13T08:30');
    // The clock is not announced every minute (SCR-Home accessibility).
    await expect(page.locator('[aria-live]').filter({ has: when })).toHaveCount(0);
    expect(await when.evaluate((el) => el.closest('[aria-live],[role="status"]'))).toBeNull();
  });

  test('F007_AC2 at 11:59:30, 30 seconds later the afternoon greeting and 12:00 show without a reload', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-10-13T11:59:30') });
    await page.goto(`${PROD}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good morning');
    await expect(page.getByTestId('home-clock')).toContainText('11:59');
    const navigations: string[] = [];
    page.on('framenavigated', (f) => navigations.push(f.url()));
    await page.clock.runFor(30_000);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good afternoon');
    await expect(page.getByTestId('home-clock')).toContainText('12:00');
    expect(navigations).toEqual([]);
  });

  test('F-007.R1 evening greeting at 18:00, and again at 04:59', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-13T18:00:00') });
    await page.goto(`${PROD}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good evening');
    await page.clock.setSystemTime(new Date('2026-10-14T04:59:00'));
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good evening');
  });
});

test.describe('F-007 search entry', () => {
  test('F007_AC3 activating the search entry opens the command palette with the field focused', async ({
    page,
    browserName,
  }) => {
    await page.goto(`${PROD}/`);
    const entry = searchEntry(page);
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('What are you looking for?');
    const dialog = page.getByRole('dialog', { name: 'Search TaroKit' });
    if (browserName === 'webkit') {
      // Safari doesn't focus a button on a mouse click, so after a click focus has no opener to return to
      // (CMP-CommandPalette: focus returns where it was). The click still opens the palette; the focus return is
      // checked from the keyboard below.
      await entry.click();
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('combobox')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await entry.focus();
      await page.keyboard.press('Enter');
    } else {
      await entry.click();
    }
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(entry).toBeFocused();
    // From the keyboard too.
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
  });
});

test.describe('F-007 favorites and recents', () => {
  test('F007_AC4 two favorites and no recents: two favorites, no recents section', async ({ page }) => {
    await seed(page, { favorites: [fx(1), fx(2)] });
    await openHome(page);
    await expect.poll(() => cardNames(page, FAVORITES)).toEqual([nameOf(fx(1)), nameOf(fx(2))]);
    await expect(region(page, RECENTS)).toHaveCount(0);
    await expect(invitation(page)).toHaveCount(0);
    // Compact cards with their favorite toggles on.
    await expect(region(page, FAVORITES).getByRole('button', { name: 'Remove from favorites' })).toHaveCount(2);
  });

  test('F007_AC5 12 recents of which 2 are favorites: 8 recents, none of them favorites', async ({ page }) => {
    const recents = Array.from({ length: 12 }, (_, i) => fx(i + 1));
    await seed(page, { favorites: [fx(3), fx(7)], recents });
    await openHome(page);
    const expected = recents
      .filter((id) => id !== fx(3) && id !== fx(7))
      .slice(0, 8)
      .map(nameOf);
    await expect.poll(() => cardNames(page, RECENTS)).toEqual(expected);
    await expect.poll(() => cardNames(page, FAVORITES)).toEqual([nameOf(fx(3)), nameOf(fx(7))]);
  });

  test('F-007.R3 sections follow the region order: favorites, recents, categories, what’s new', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-04T12:00:00'));
    await seed(page, { favorites: [fx(1)], recents: [fx(2)] });
    await openHome(page);
    const headings = await page.locator('main').locator('h1:visible, h2:visible').allTextContents();
    // Noon: the afternoon greeting; every fixture tool was added on 2026-10-01, so what's new shows.
    expect(headings.map((h) => h.trim())).toEqual(['Good afternoon', FAVORITES, RECENTS, CATEGORIES, WHATS_NEW]);
  });

  test('F-005.R1 unpinning the last favorite on home shows the invitation at once', async ({ page }) => {
    await seed(page, { favorites: [fx(1)] });
    await openHome(page);
    await region(page, FAVORITES).getByRole('button', { name: 'Remove from favorites' }).click();
    await expect(region(page, FAVORITES)).toHaveCount(0);
    await expect(invitation(page)).toHaveCount(1);
  });
});

test.describe('F-007 first visit', () => {
  test('F007_AC10 no favorites and no recents on a device with a keyboard: the invitation with the shortcut', async ({
    page,
  }) => {
    await openHome(page);
    await expect(invitation(page)).toHaveCount(1);
    await expect(invitation(page).locator('.tk-state__title')).toHaveText(INVITE);
    await expect(invitation(page).locator('kbd')).toHaveText(/^(⌘K|Ctrl K)$/);
    await expect(invitation(page).getByRole('link', { name: 'Browse my tools' })).toHaveAttribute('href', '/tools/');
    await expect(region(page, FAVORITES)).toHaveCount(0);
    await expect(region(page, RECENTS)).toHaveCount(0);
    // SCR-Home empty: greeting, search, invitation, browse by category, then what's new.
    const order = await page
      .locator('main')
      .evaluate((main) =>
        [...main.querySelectorAll('h1, [data-testid="home-search"], .tk-state, h2')]
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => (el.matches('h1, h2') ? el.textContent?.trim() : el.matches('.tk-state') ? 'invite' : 'search')),
      );
    expect(order.slice(1, 4)).toEqual(['search', 'invite', CATEGORIES]);
  });

  test('F007_AC10 on a touch-only device: the touch invitation, with no shortcut', async ({ browser, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox has no mobile emulation');
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    expect(await page.evaluate(() => matchMedia('(any-hover: none) and (any-pointer: coarse)').matches)).toBeTruthy();
    await openHome(page);
    await expect(invitation(page)).toHaveCount(1);
    await expect(invitation(page).locator('.tk-state__title')).toHaveText(INVITE_TOUCH);
    await expect(invitation(page).locator('kbd')).toHaveCount(0);
    await context.close();
  });

  test('F-007.R6 the prediction shows the right invitation before the island loads, and nothing jumps', async ({
    page,
  }) => {
    // Hold the home island's code back: until it runs, the page shows what the reserve script predicted.
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/_astro\/HomePersonal\.[^/]*\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${FX}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#tk-home-personal')).toHaveAttribute('data-state', 'empty');
    await expect(invitation(page)).toHaveCount(1);
    await expect(invitation(page).locator('.tk-state__title')).toHaveText(INVITE);
    const before = await page.getByRole('region', { name: CATEGORIES }).boundingBox();
    release();
    await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
    await expect(invitation(page)).toHaveCount(1);
    expect(await page.getByRole('region', { name: CATEGORIES }).boundingBox()).toEqual(before);
  });
});

test.describe('F-007 no layout jump', () => {
  test('F-007.R3 with favorites and recents, placeholders hold their place until the island fills them', async ({
    page,
  }) => {
    await seed(page, { favorites: [fx(1), fx(2), fx(3), fx(4), fx(5)], recents: [fx(6), fx(7), fx(8)] });
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/_astro\/HomePersonal\.[^/]*\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${FX}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#tk-home-personal')).toHaveAttribute('data-state', 'default');
    // No wrong content: no invitation, and the placeholders are invisible and hidden from assistive technology.
    await expect(invitation(page)).toHaveCount(0);
    await expect(page.locator('[data-tk-home-reserve] .tk-toolcard')).toHaveCount(8);
    await expect(page.locator('[data-tk-home-reserve]')).toHaveAttribute('aria-hidden', 'true');
    await fontsLoaded(page);
    const before = await page.getByRole('region', { name: CATEGORIES }).boundingBox();
    release();
    await expect(page.locator('[data-tk-home-ready]')).toBeAttached();
    await expect.poll(() => cardNames(page, FAVORITES)).toHaveLength(5);
    await expect(page.locator('[data-tk-home-reserve]')).toBeHidden();
    expect(await page.getByRole('region', { name: CATEGORIES }).boundingBox()).toEqual(before);
  });

  test('F-007.R3 on a narrow screen, where tool names wrap, the placeholders still hold the exact place', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seed(page, {
      favorites: ['sample-dev', 'sample-converter'],
      recents: ['sample-media', 'sample-productivity'],
    });
    let release: () => void = () => {};
    const held = new Promise<void>((r) => (release = r));
    await page.route(/\/_astro\/HomePersonal\.[^/]*\.js$/, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-tk-home-reserve] .tk-toolcard')).toHaveCount(4);
    await fontsLoaded(page);
    const before = await page.getByRole('region', { name: CATEGORIES }).boundingBox();
    release();
    await expect.poll(() => cardNames(page, RECENTS)).toHaveLength(2);
    expect(await page.getByRole('region', { name: CATEGORIES }).boundingBox()).toEqual(before);
  });

  test('F-007.R3 home’s content loads with no layout shift (CLS 0) with personal data', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'layout-shift entries are Chromium-only');
    await seed(page, { favorites: [fx(1), fx(2)], recents: [fx(3), fx(4), fx(5)] });
    // Shifts of home's own content (inside main); the shell header's font swap is not home's.
    await page.addInitScript(() => {
      type Shift = { value: number; hadRecentInput: boolean; sources: { node?: Node | null }[] };
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as Shift[]) {
          const inMain = e.sources.some((s) => !!s.node && !!document.getElementById('main')?.contains(s.node));
          if (!e.hadRecentInput && inMain) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await openHome(page);
    await expect.poll(() => cardNames(page, RECENTS)).toHaveLength(3);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });
});

test.describe('F-007 introduction', () => {
  test('F007_AC9 the Owner’s name and headline are shown with a link to About', async ({ page }) => {
    await page.goto(`${PROD}/`);
    const intro = page.getByTestId('home-intro');
    await expect(intro).toHaveText(`I'm ${prod.profile.nickname ?? prod.profile.name}. ${prod.profile.headline}`);
    const about = page.getByRole('main').getByRole('link', { name: 'About me' });
    await expect(about).toHaveAttribute('href', '/about/');
    await about.click();
    await expect(page).toHaveURL(`${PROD}/about/`);
  });

  test('F007_AC9 on the fixture profile too', async ({ page }) => {
    await page.goto(`${FX}/`);
    await expect(page.getByTestId('home-intro')).toHaveText(
      `I'm ${fixture.profile.nickname ?? fixture.profile.name}. ${fixture.profile.headline}`,
    );
  });
});

test.describe('F-007 browse by category', () => {
  for (const [label, base, registry] of [
    ['production', PROD, prod],
    ['fixture', FX, fixture],
  ] as const) {
    test(`F007_AC11 one tile per visible category, in order, with icon, tint, name and count (${label})`, async ({
      page,
    }) => {
      await page.goto(`${base}/`);
      const visible = registry.categories
        .map((c) => ({ c, n: c.tools.filter((t) => !t.hidden).length }))
        .filter(({ n }) => n > 0);
      const tiles = region(page, CATEGORIES).getByRole('link');
      await expect(tiles).toHaveCount(visible.length);
      for (const [i, { c, n }] of visible.entries()) {
        const tile = tiles.nth(i);
        const count = n === 1 ? '1 tool' : `${n} tools`;
        await expect(tile).toHaveAccessibleName(`${pick(c.name, 'en-US')}, ${count}`);
        await expect(tile).toContainText(pick(c.name, 'en-US'));
        await expect(tile).toContainText(count);
        await expect(tile).toHaveAttribute('href', `/tools/${c.id}/`);
        await expect(tile).toHaveAttribute('data-tint', c.tint);
        await expect(tile.locator('.icon svg')).toBeVisible();
        const [bg, token] = await tile.evaluate((el, tint) => {
          const icon = el.querySelector('.icon')!;
          const probe = document.createElement('span');
          probe.style.background = `var(--tk-color-cat-${tint}-bg)`;
          document.body.append(probe);
          const want = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return [getComputedStyle(icon).backgroundColor, want];
        }, c.tint);
        expect(bg).toBe(token);
      }
      await tiles.first().click();
      await expect(page).toHaveURL(`${base}/tools/${visible[0]!.c.id}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(pick(visible[0]!.c.name, 'en-US'));
    });
  }
});

test.describe('F-007 what’s new', () => {
  const FIXTURE = `${FX}/__fixtures__/whats-new/`;
  const items = (page: Page, set: string) =>
    page.getByTestId(set).getByRole('region', { name: WHATS_NEW }).getByRole('listitem');

  async function openAt(page: Page, day: string) {
    await page.clock.setFixedTime(new Date(`${day}T12:00:00`));
    await page.goto(FIXTURE);
    await expect(page.locator('[data-tk-whatsnew-ready]')).toHaveCount(4);
  }

  test('F007_AC6 a tool added 3 days ago is listed, one added 60 days ago is not', async ({ page }) => {
    await openAt(page, '2026-10-04');
    await expect(items(page, 'ac6')).toHaveCount(1);
    await expect(items(page, 'ac6').first()).toContainText('Added');
    await expect(items(page, 'ac6').first().getByRole('link')).toHaveText('Three days old');
  });

  test('F007_AC7 8 tools added within the last 30 days: the 6 newest are listed', async ({ page }) => {
    await openAt(page, '2026-10-04');
    await expect(items(page, 'ac7')).toHaveCount(6);
    const names = await items(page, 'ac7').getByRole('link').allTextContents();
    expect(names).toEqual(['Tool 8', 'Tool 7', 'Tool 6', 'Tool 5', 'Tool 4', 'Tool 3']);
  });

  test('F007_AC8 a tool added 10 days ago and updated 2 days ago is listed once, as updated, by the 2-day date', async ({
    page,
  }) => {
    await openAt(page, '2026-10-04');
    await expect(items(page, 'ac8')).toHaveCount(2);
    const first = items(page, 'ac8').first();
    await expect(first.getByRole('link')).toHaveText('Updated tool');
    await expect(first).toContainText('Improved');
    await expect(first.locator('time')).toHaveAttribute('datetime', '2026-10-02');
    await expect(items(page, 'ac8').nth(1).getByRole('link')).toHaveText('Added three days ago');
    await expect(items(page, 'ac8').filter({ hasText: 'Updated tool' })).toHaveCount(1);
  });

  test('F-007.R4 with nothing in the window, the section is not shown', async ({ page }) => {
    await openAt(page, '2026-10-04');
    await expect(page.getByTestId('none').getByRole('region', { name: WHATS_NEW })).toHaveCount(0);
  });

  test('RULE-04 production home lists what’s new on the viewer’s date, and nothing once the window has passed', async ({
    page,
  }) => {
    const latest = prod.visibleTools
      .map((t) => t.updated ?? t.added)
      .sort()
      .at(-1)!;
    const day = (offset: number) => {
      const d = new Date(`${latest}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + offset);
      return d.toISOString().slice(0, 10);
    };
    await page.clock.setFixedTime(new Date(`${day(3)}T12:00:00`));
    await openHome(page, PROD);
    const expected = whatsNew(prod.visibleTools, day(3));
    const list = region(page, WHATS_NEW).getByRole('listitem');
    await expect(list).toHaveCount(expected.length);
    expect(await list.getByRole('link').allTextContents()).toEqual(expected.map((i) => i.name));
    for (const [i, item] of expected.entries()) {
      await expect(list.nth(i).getByRole('link')).toHaveAttribute('href', `/t/${item.id}/`);
      await expect(list.nth(i)).toContainText(pick(prod.toolById(item.id)!.summary, 'en-US'));
    }
    await page.clock.setFixedTime(new Date(`${day(40)}T12:00:00`));
    await openHome(page, PROD);
    await expect(region(page, WHATS_NEW)).toHaveCount(0);
  });
});

test.describe('F-007 accessibility', () => {
  const states = {
    populated: (page: Page) => seed(page, { favorites: [fx(1), 'fx-linked'], recents: [fx(2), fx(3), 'ft-embedded'] }),
    'first visit': async () => {},
    'storage unavailable': (page: Page) =>
      page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
        });
      }),
  } as const;
  for (const scheme of ['dark', 'light'] as const) {
    for (const [state, setup] of Object.entries(states)) {
      test(`NFR-03 home (${state}, ${scheme}) has no axe violations`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.clock.setFixedTime(new Date('2026-10-04T12:00:00'));
        await setup(page);
        await openHome(page);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
      });
    }
  }

  test('SCR-Home the greeting is the only main heading, and each section has a heading', async ({ page }) => {
    await seed(page, { favorites: [fx(1)], recents: [fx(2)] });
    await openHome(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    for (const name of [FAVORITES, RECENTS, CATEGORIES])
      await expect(region(page, name).getByRole('heading', { level: 2, name })).toBeVisible();
  });
});

test('the production build has no tests-only what’s new page', async ({ request }) => {
  expect((await request.get(`${PROD}/__fixtures__/whats-new/`)).status()).toBe(404);
});
