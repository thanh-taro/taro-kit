// F-017 Read the Owner's résumé (SCR-Resume), end to end. The production build (PROD) renders the sample résumé
// (tests/fixtures/content/samples/resume.yaml), so expectations come from that file's registry. The fixture build (FX,
// tests/fixtures/content/F005-favorites) has no résumé: no page, and nothing links to it (F-017.AC8). Per-entry
// details (AC1 to AC6) on chosen fixtures are in tests/unit/resume.test.ts; here they are checked as served.
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { t } from '../../src/modules/copy/index.ts';
import { resumeView, sectionTitle } from '../../src/modules/pages/resume/resume.ts';
import { FX, PROD, SAMPLES_CONTENT } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const samples = loadRegistry({ root, contentDir: join(root, SAMPLES_CONTENT) });
const fx = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const view = resumeView(samples.resume!);
const NAV = ['Home', 'Tools', 'Projects', 'About me', 'Résumé', 'Now'];
const NAV_WITHOUT = ['Home', 'Tools', 'Projects', 'About me', 'Now'];

const mainNav = (page: Page) => page.locator('#main-menu > li:not(.narrow-only) > a');

/** Mod+K as the bootstrap reads the platform, then waits for the island's data. */
async function openPalette(page: Page) {
  const apple = await page.evaluate(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || '');
  });
  await page.keyboard.press(`${apple ? 'Meta' : 'Control'}+k`);
  const dialog = page.getByRole('dialog', { name: 'Search TaroKit' });
  await expect(dialog.locator('.tk-palette')).toHaveAttribute('data-ready', '');
  return dialog
    .getByRole('listbox')
    .getByRole('group', { name: 'Pages', exact: true })
    .getByRole('option')
    .evaluateAll((els) => els.map((el) => el.querySelector('.tk-palette__name')!.textContent!.trim()));
}

test.describe('F-017 Résumé page', () => {
  test('SCR-Resume default: heading, intro and the sections with entries in RULE-15 order, Résumé marked', async ({
    page,
  }) => {
    const res = await page.goto(`${PROD}/resume/`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('My résumé');
    await expect(page.getByText(t('COPY-resume.intro'), { exact: true })).toBeVisible();
    const titles = view.sections.map(sectionTitle);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(titles);
    for (const name of titles) await expect(page.getByRole('region', { name })).toBeVisible();
    await expect(mainNav(page).filter({ hasText: 'Résumé' })).toHaveAttribute('aria-current', 'page');
  });

  test('F017_AC2 F017_AC3 experience entries in written order, each with role, organization and period', async ({
    page,
  }) => {
    await page.goto(`${PROD}/resume/`);
    const region = page.getByRole('region', { name: 'Experience' });
    await expect(region.getByRole('heading', { level: 3 })).toHaveText(view.experience.map((e) => e.role));
    const current = view.experience.find((e) => e.period.current)!;
    const entry = region.locator('ol > li').filter({ has: page.getByRole('heading', { name: current.role }) });
    await expect(entry).toContainText(current.organization);
    await expect(entry.locator('.period')).toHaveText(current.period.text);
    await expect(entry.locator('time')).toHaveAttribute('datetime', current.period.parts[0]!.datetime!);
    for (const h of current.highlights) await expect(entry).toContainText(h);
  });

  test('F017_AC4 an education entry shows its program, institution, level and period', async ({ page }) => {
    await page.goto(`${PROD}/resume/`);
    const e = view.education[0]!;
    const entry = page.getByRole('region', { name: 'Education' }).locator('ol > li').first();
    await expect(entry.getByRole('heading', { level: 3 })).toHaveText(e.program);
    await expect(entry).toContainText(e.institution);
    if (e.level) await expect(entry).toContainText(e.level);
    await expect(entry.locator('.period')).toHaveText(e.period.text);
  });

  test('F017_AC5 skill level marks are hidden from assistive technology, and the level is read in words', async ({
    page,
  }) => {
    await page.goto(`${PROD}/resume/`);
    const skills = page.getByRole('region', { name: 'Skills' }).getByRole('listitem');
    await expect(skills).toHaveCount(view.skills.length);
    for (const [i, s] of view.skills.entries()) {
      const item = skills.nth(i);
      if (s.marks) {
        await expect(item.locator('.marks')).toHaveAttribute('aria-hidden', 'true');
        await expect(item.locator('.mark[data-filled]')).toHaveCount(s.marks.filter(Boolean).length);
        await expect(item.locator('.tk-visually-hidden')).toHaveText(s.levelText!);
        await expect(item.locator('.name')).toHaveText(s.name);
      } else {
        await expect(item).toHaveText(s.name);
      }
    }
  });

  test('F017_AC6 languages with their level; certificates and awards with issuer and year', async ({ page }) => {
    await page.goto(`${PROD}/resume/`);
    const rows = (name: string) => page.getByRole('region', { name }).getByRole('listitem');
    for (const [i, l] of view.languages.entries()) {
      await expect(rows('Languages').nth(i)).toContainText(l.name);
      await expect(rows('Languages').nth(i)).toContainText(l.level);
    }
    for (const [name, items] of [
      ['Certificates', view.certificates],
      ['Awards', view.awards],
    ] as const)
      for (const [i, c] of items.entries())
        for (const part of [c.name, c.issuer, String(c.year)]) await expect(rows(name).nth(i)).toContainText(part);
  });

  test('F017_AC7 with a résumé, navigation includes Résumé on every portal page, and About links to it', async ({
    page,
  }) => {
    for (const path of ['/', '/tools/', '/projects/', '/about/', '/resume/', '/now/', '/settings/']) {
      await page.goto(`${PROD}${path}`);
      await expect(mainNav(page), path).toHaveText(NAV);
    }
    await page.goto(`${PROD}/about/`);
    const pointer = page.getByRole('link', { name: t('COPY-about.resume') });
    await expect(pointer).toHaveAttribute('href', '/resume/');
    await pointer.click();
    await expect(page).toHaveURL(`${PROD}/resume/`);
  });

  test("F017_AC7 with a résumé, the palette's empty-query Pages group includes Résumé", async ({ page }) => {
    await page.goto(`${PROD}/about/`);
    await page.waitForLoadState('load');
    expect(await openPalette(page)).toEqual([...NAV, 'Settings']);
  });

  test('F017_AC8 without a résumé there is no Résumé page, no navigation item, no palette page, no About link and no site-index entry', async ({
    page,
    request,
  }) => {
    expect(fx.resume).toBeUndefined();
    const res = await page.goto(`${FX}/resume/`);
    expect(res?.status()).toBe(404);
    await page.goto(`${FX}/about/`);
    await page.waitForLoadState('load');
    await expect(mainNav(page)).toHaveText(NAV_WITHOUT);
    await expect(page.locator('a[href="/resume/"]')).toHaveCount(0);
    expect(await openPalette(page)).toEqual([...NAV_WITHOUT, 'Settings']);
    expect(await (await request.get(`${FX}/sitemap.xml`)).text()).not.toContain('/resume/');
  });

  test('F017_AC11 the link preview declares the résumé title, description and shared image; the site index lists /resume/', async ({
    request,
  }) => {
    const html = await (await request.get(`${PROD}/resume/`)).text();
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('<title>Résumé — TaroKit</title>');
    expect(head).toMatch(/<meta property="og:title" content="Résumé — TaroKit"/);
    expect(head).toContain(`<meta property="og:description" content="${t('COPY-meta.resumeDescription')}"`);
    expect(head).toMatch(new RegExp(`<meta property="og:image" content="${samples.portalOrigin}/preview.png"`));
    expect(head).toMatch(new RegExp(`<meta property="og:url" content="${samples.portalOrigin}/resume/"`));
    const sitemap = await (await request.get(`${PROD}/sitemap.xml`)).text();
    expect(sitemap).toContain(`<loc>${samples.portalOrigin}/resume/</loc>`);
  });

  test('F-011 the Résumé page is in the offline precache', async ({ request }) => {
    expect(await (await request.get(`${PROD}/sw.js`)).text()).toContain('resume/index.html');
  });

  for (const scheme of ['dark', 'light'] as const)
    for (const [size, viewport] of Object.entries({
      desktop: { width: 1440, height: 900 },
      narrow: { width: 390, height: 844 },
    }))
      test(`NFR-03 /resume/ has no serious axe issues and no sideways scroll (${size}, ${scheme})`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`${PROD}/resume/`);
        await expect(page.locator('html')).toHaveAttribute('data-theme', scheme);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      });

  test('NFR-07 CMP-AppShell full: with six navigation items, the bar fits without overlap at every width', async ({
    page,
  }) => {
    await page.goto(`${PROD}/resume/`);
    await page.waitForLoadState('load');
    for (const width of [721, 724, 740, 772, 800, 880, 881, 900, 945, 960, 961, 977, 1000, 1001, 1119, 1120, 1440]) {
      await page.setViewportSize({ width, height: 600 });
      const problem = await page.evaluate(() => {
        const bar = document.querySelector('header.shell')!;
        if (bar.scrollWidth > bar.clientWidth) return 'bar scrolls';
        // Islands' <astro-island> wrappers are `display: contents`; their content is measured instead.
        const parts = [...bar.children]
          .map((el) => (getComputedStyle(el).display === 'contents' ? el.firstElementChild : el))
          .filter((el): el is Element => !!el && getComputedStyle(el).display !== 'none');
        const rects = parts.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 0);
        for (let i = 1; i < rects.length; i++)
          if (rects[i]!.left < rects[i - 1]!.right - 0.5) return `part ${i} overlaps the part before it`;
        if (rects.at(-1)!.right > bar.getBoundingClientRect().right + 0.5) return 'last part leaves the bar';
        const search = bar.querySelector<HTMLElement>('.search')!;
        if (getComputedStyle(search).display !== 'none' && search.scrollWidth > search.clientWidth + 1)
          return 'the search control is cut';
        return '';
      });
      expect(problem, `${width}px`).toBe('');
    }
  });
});
