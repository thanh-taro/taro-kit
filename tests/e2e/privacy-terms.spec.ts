// F-018 Read the privacy policy and terms (SCR-Policy, the CMP-AppShell footer), end to end against the production
// pages over the sample content (PROD, tests/fixtures/content/samples): its privacy.yaml has two sections, a list of
// three items and a paragraph with a web link and an email link; its terms.yaml has three sections. Expectations come
// from that content's registry. The sample content lists no visible linked tool, so the tool views come from the
// fixture build (FX, tests/fixtures/content/F005-favorites: ft-embedded and fx-linked). Body-format and validation failures (AC5, AC6, AC9, AC10) are unit tests
// (tests/unit/privacy-terms.test.ts).
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { FX, PROD, SAMPLES_CONTENT } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const samples = loadRegistry({ root, contentDir: join(root, SAMPLES_CONTENT) });
const fx = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const hiddenTool = samples.allTools.find((tool) => tool.hidden)!;
const embeddedTool = fx.toolById('ft-embedded')!;
const linkedTool = fx.toolById('fx-linked')!;
const category = samples.categories[0]!;

const footer = (page: Page) => page.getByRole('contentinfo');
const footerLink = (page: Page, name: 'Privacy' | 'Terms') => footer(page).getByRole('link', { name, exact: true });

test.describe('F-018 SCR-Policy', () => {
  test('F018_AC1 the Privacy page: the title is the only h1, two h2 sections with their paragraphs, the full date', async ({
    page,
  }) => {
    const res = await page.goto(`${PROD}/privacy/`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle('Privacy — TaroKit');
    const main = page.getByRole('main');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText([samples.privacy.title['en-US']]);
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(
      samples.privacy.sections.map((s) => s.heading['en-US']),
    );
    // Each heading is followed by its section's paragraphs (in the body version of the language showing).
    for (const section of samples.privacy.sections) {
      const first = section.blocks['en-US'].find((b) => b.kind === 'paragraph')!;
      const h2 = main.getByRole('heading', { level: 2, name: section.heading['en-US'] });
      const next = h2.locator('xpath=following-sibling::div[@lang="en-US"][1]/*[1]');
      await expect(next).toHaveJSProperty('tagName', 'P');
      await expect(next).toContainText(first.parts.map((p) => p.text).join(''));
    }
    await expect(main.getByText('Last updated October 22, 2026', { exact: true })).toBeVisible();
    await expect(main.locator('time')).toHaveAttribute('datetime', '2026-10-22');
    await expect(main.locator('time')).toHaveText('October 22, 2026');
  });

  test('F018_AC2 the Terms page shows the title, the three headings, their paragraphs and the date', async ({
    page,
  }) => {
    const res = await page.goto(`${PROD}/terms/`);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle('Terms — TaroKit');
    const main = page.getByRole('main');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(['Terms']);
    await expect(main.getByRole('heading', { level: 2 })).toHaveText(
      samples.terms.sections.map((s) => s.heading['en-US']),
    );
    expect(samples.terms.sections).toHaveLength(3);
    for (const section of samples.terms.sections)
      for (const block of section.blocks['en-US'])
        if (block.kind === 'paragraph') await expect(main).toContainText(block.parts.map((p) => p.text).join(''));
    await expect(main.getByText('Last updated October 22, 2026', { exact: true })).toBeVisible();
  });

  test('F018_AC8 links show their text and go to their address; the web link opens a new tab; the list has three items', async ({
    page,
  }) => {
    await page.goto(`${PROD}/privacy/`);
    const main = page.getByRole('main');
    const web = main.getByRole('link', { name: 'its privacy policy' });
    await expect(web).toHaveAttribute('href', 'https://www.cloudflare.com/privacypolicy/');
    await expect(web).toHaveAttribute('target', '_blank');
    await expect(web).toHaveAttribute('rel', 'noopener noreferrer');
    const mail = main.getByRole('link', { name: 'adamnguyen.itdn@gmail.com' });
    await expect(mail).toHaveAttribute('href', 'mailto:adamnguyen.itdn@gmail.com');
    await expect(mail).not.toHaveAttribute('target', /.*/);
    const list = main.getByRole('list');
    await expect(list).toHaveCount(1);
    await expect(list.getByRole('listitem')).toHaveText([
      'the first sample item;',
      'the second sample item;',
      'the third sample item.',
    ]);
    // Other bracket syntax stays literal text (F-018 edge case).
    await expect(main).toContainText('with [bracketed text] that stays as it is.');
    // The web link really opens a new tab (without a network request to the third party).
    await page.context().route('https://www.cloudflare.com/**', (route) => route.fulfill({ body: 'stub' }));
    const [popup] = await Promise.all([page.context().waitForEvent('page'), web.click()]);
    await expect(popup).toHaveURL('https://www.cloudflare.com/privacypolicy/');
    expect(page.url()).toBe(`${PROD}/privacy/`);
  });

  for (const scheme of ['dark', 'light'] as const)
    test(`NFR-03 the Privacy and Terms pages have no axe violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      for (const path of ['/privacy/', '/terms/']) {
        await page.goto(`${PROD}${path}`);
        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations).toEqual([]);
      }
    });
});

test.describe('F-018 CMP-AppShell footer', () => {
  const pages: [name: string, path: string][] = [
    ['Home', '/'],
    ['Tools', '/tools/'],
    ['a category', `/tools/${category.id}/`],
    ['About', '/about/'],
    ['Résumé', '/resume/'],
    ['Now', '/now/'],
    ['Settings', '/settings/'],
    ['Privacy', '/privacy/'],
    ['Terms', '/terms/'],
    ['a hidden tool (not found)', `/t/${hiddenTool.id}/`],
  ];

  test('F018_AC3 every listed page links to Privacy and Terms, and marks the page shown as current', async ({
    page,
  }) => {
    for (const [name, path] of pages) {
      await test.step(name, async () => {
        await page.goto(`${PROD}${path}`);
        await expect(footer(page)).toHaveCount(1);
        await expect(footerLink(page, 'Privacy')).toHaveAttribute('href', '/privacy/');
        await expect(footerLink(page, 'Terms')).toHaveAttribute('href', '/terms/');
        const current = footer(page).locator('[aria-current="page"]');
        if (path === '/privacy/') await expect(current).toHaveText(['Privacy']);
        else if (path === '/terms/') await expect(current).toHaveText(['Terms']);
        else await expect(current).toHaveCount(0);
        // The current page is marked visibly too, not by color alone: an underline only it has.
        for (const name of ['Privacy', 'Terms'] as const)
          await expect(footerLink(page, name)).toHaveCSS(
            'text-decoration-line',
            path === `/${name.toLowerCase()}/` ? 'underline' : 'none',
          );
      });
    }
    // The hidden tool's address really is the not-found page.
    await page.goto(`${PROD}/t/${hiddenTool.id}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("I can't find that page");
  });

  test('F018_AC3 the tool view of an embedded and of a linked tool shows neither link', async ({ page }) => {
    expect([embeddedTool.openMode, linkedTool.openMode]).toEqual(['embedded', 'linked']);
    for (const tool of [embeddedTool, linkedTool]) {
      await test.step(tool.openMode, async () => {
        const res = await page.goto(`${FX}/t/${tool.id}/`);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole('heading', { name: tool.name }).first()).toBeVisible();
        await expect(page.getByRole('contentinfo')).toHaveCount(0);
        await expect(page.locator('a[href="/privacy/"], a[href="/terms/"]')).toHaveCount(0);
      });
    }
  });

  test('CMP-AppShell the footer comes after main and starts below the first screen', async ({ page }) => {
    for (const path of ['/', '/terms/']) {
      await page.goto(`${PROD}${path}`);
      const order = await page.evaluate(() => {
        const main = document.querySelector('main')!;
        const foot = document.querySelector('footer')!;
        return main.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING;
      });
      expect(order).toBeTruthy();
      const top = await footer(page).evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(page.viewportSize()!.height);
    }
  });

  test('NFR-09 on a narrow screen the footer links are 44 px touch targets and the page does not scroll sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PROD}/privacy/`);
    for (const name of ['Privacy', 'Terms'] as const) {
      const box = (await footerLink(page, name).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe('F-018 offline', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'service-worker offline runs use Chromium emulation (SP-4)',
  );

  test('F018_AC7 after one online visit, the Privacy page opens offline and shows the policy', async ({
    page,
    context,
  }) => {
    const res = await page.goto(`${PROD}/`);
    expect(res?.ok()).toBe(true);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await context.setOffline(true);
    await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
    const offline = await page.goto(`${PROD}/privacy/`);
    expect(offline?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(samples.privacy.title['en-US']);
    await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveText(
      samples.privacy.sections.map((s) => s.heading['en-US']),
    );
  });
});
