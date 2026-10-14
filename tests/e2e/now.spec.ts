// F-010 Now and changelog (SCR-Now) in the built portal. The stale label (RULE-09) is computed in the browser
// against the viewer's local date, so these tests move the page clock over one build: the production build
// (port TK_E2E_PORT, content/now.yaml) for the note and the changelog, and the fixture build (TK_E2E_FIXTURES_PORT)
// for the states the production content does not have (no Now note; no note and no tools).
import AxeBuilder from '@axe-core/playwright';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { changelog, loadRegistry } from '../../src/modules/content/index.ts';
import { FX, PROD } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'content') });
const noteDate = registry.now?.updated ?? '';

/** `date` (YYYY-MM-DD) plus `days`, as YYYY-MM-DD. */
const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
/** Opens SCR-Now with the viewer's clock at local noon, `days` after the note's last updated date. */
async function openNowAt(page: Page, days: number, base = PROD) {
  await page.clock.setFixedTime(new Date(`${addDays(noteDate, days)}T12:00:00`));
  await page.goto(`${base}/now/`);
  // The island has run once it reports fresh or stale.
  await expect(page.getByTestId('now-stale')).not.toHaveAttribute('data-state', 'pending');
}
const staleLabel = (page: Page) => page.getByText('I wrote this a while ago, so it may be out of date.');

test.describe('F-010 Now note', () => {
  test.skip(!noteDate, 'the production content has no Now note');

  test('F010_AC1 a note updated 10 days ago shows the note and its date, without the stale label', async ({ page }) => {
    await openNowAt(page, 10);
    await expect(page).toHaveTitle('Now — TaroKit');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("What I'm up to");
    await expect(page.locator(`time[datetime="${noteDate}"]`).first()).toContainText('Updated');
    await expect(page.getByTestId('now-stale')).toHaveAttribute('data-state', 'fresh');
    await expect(staleLabel(page)).toHaveCount(0);
    // Shell navigation marks Now (SCR-Now region 1).
    await expect(page.getByRole('navigation').first().getByRole('link', { name: 'Now' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('F010_AC2 a note updated 120 days ago shows the possibly-out-of-date label', async ({ page }) => {
    await openNowAt(page, 120);
    await expect(staleLabel(page)).toBeVisible();
  });

  test('F010_AC3 a note 89 days old has no label, and the same build viewed 2 days later does', async ({ page }) => {
    await openNowAt(page, 89);
    await expect(staleLabel(page)).toHaveCount(0);
    await openNowAt(page, 91);
    await expect(staleLabel(page)).toBeVisible();
  });
});

test.describe('F-010 static page', () => {
  test('RULE-09 the server HTML carries no stale label; only the island adds it', async ({ request }) => {
    const html = await (await request.get(`${PROD}/now/`)).text();
    // The label text is only in the island's serialized props; the rendered slot is empty and pending.
    expect(html).toMatch(/<span class="now-stale"[^>]*data-state="pending"[^>]*><\/span>/);
    expect(html).not.toMatch(/<span class="label"[^>]*>I wrote this a while ago/);
  });
});

test.describe('F-010 changelog', () => {
  test('F010_AC4 the changelog is grouped by month, newest first, and each item links to its tool', async ({
    page,
  }) => {
    await openNowAt(page, 0);
    const months = changelog(registry.allTools);
    const log = page.getByRole('region', { name: "What I've shipped" });
    await expect(log.getByRole('heading', { level: 3 })).toHaveCount(months.length);
    const first = months[0].items[0];
    const link = log.getByRole('link', { name: first.name }).first();
    await expect(link).toHaveAttribute('href', `/t/${first.id}/`);
    await link.click();
    await expect(page).toHaveURL(`${PROD}/t/${first.id}/`);
  });

  test('F010_AC5 with no Now note and two visible tools, only the changelog is shown', async ({ page }) => {
    await page.goto(`${FX}/__fixtures__/now-no-note/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("What I've shipped");
    await expect(page.getByText("What I'm up to")).toHaveCount(0);
    await expect(page.getByTestId('now-stale')).toHaveCount(0);
    // F-010.AC4 on the page: Regex Tester added in March and improved in May; May first.
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['May 2026', 'March 2026']);
    // Each link's name carries its kind, so the two Regex Tester links can be told apart.
    await expect(page.getByRole('link', { name: 'Improved Regex Tester', exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Added Regex Tester', exact: true })).toHaveCount(1);
    const items = page.getByRole('main').getByRole('listitem');
    await expect(items).toHaveText([/Improved\s*Regex Tester/, /Added\s*Color Picker/, /Added\s*Regex Tester/]);
  });

  test('F010_AC6 with no Now note and no visible tools, the empty state is shown', async ({ page }) => {
    await page.goto(`${FX}/__fixtures__/now-empty/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("What I'm up to");
    await expect(page.getByText('Nothing to share yet. Check back soon.')).toBeVisible();
    await expect(page.getByText("What I've shipped")).toHaveCount(0);
  });
});

test.describe('SCR-Now accessibility', () => {
  for (const scheme of ['dark', 'light'] as const)
    for (const [state, open] of [
      ['default', (p: Page) => openNowAt(p, 10)],
      ['stale', (p: Page) => openNowAt(p, 120)],
      ['no note', (p: Page) => p.goto(`${FX}/__fixtures__/now-no-note/`)],
      ['empty', (p: Page) => p.goto(`${FX}/__fixtures__/now-empty/`)],
    ] as const)
      test(`NFR-03 axe finds no serious issues, ${state} (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await open(page);
        const { violations } = await new AxeBuilder({ page }).analyze();
        expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
      });
});
