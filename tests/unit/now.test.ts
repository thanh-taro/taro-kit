// F-010 Now and changelog (SCR-Now): RULE-09 staleness against the viewer's date (fixed clock), the RULE-04
// changelog, and the page's states rendered through Astro's container API (MOD-Pages over MOD-Content).
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { changelog, loadRegistry } from '../../src/modules/content/index.ts';
import NowView from '../../src/modules/pages/now/NowView.astro';
import { around, nowView, type NowViewData } from '../../src/modules/pages/now/now.ts';
import { isStale, STALE_DAYS, staleToday } from '../../src/modules/pages/now/stale.ts';

const root = join(import.meta.dirname, '../..');
const fixture = (name: string) => loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content', name) });

const tool = (id: string, name: string, added: string, updated?: string, hidden = false) => ({
  id,
  name,
  added,
  updated,
  hidden,
});
const note = (updated: string) => ({ body: 'First paragraph.\n\nSecond paragraph.\n', updated });

async function render(view: NowViewData) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return container.renderToString(NowView, { props: { view } });
}

afterEach(() => {
  vi.useRealTimers();
});

/** Sets the viewer's clock to local noon of `date` (YYYY-MM-DD). */
const clockAt = (date: string) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T12:00:00`));
};

describe('RULE-09 stale Now note (fixed clock)', () => {
  test('F010_AC1 a note updated 10 days ago is not stale', () => {
    clockAt('2026-10-23');
    expect(staleToday('2026-10-13')).toBe(false);
  });

  test('F010_AC2 a note updated 120 days ago is labeled possibly out of date', () => {
    clockAt('2027-02-10'); // 2026-10-13 + 120 days
    expect(staleToday('2026-10-13')).toBe(true);
  });

  test('F010_AC3 a note 89 days old is not stale, and the same build 2 days later is', () => {
    clockAt('2027-01-10'); // 2026-10-13 + 89 days
    expect(staleToday('2026-10-13')).toBe(false);
    clockAt('2027-01-12'); // 91 days, no new publish
    expect(staleToday('2026-10-13')).toBe(true);
  });

  test('RULE-09 "more than 90 days": exactly 90 days old is not stale, 91 is', () => {
    expect(STALE_DAYS).toBe(90);
    expect(isStale('2026-10-13', '2027-01-11')).toBe(false);
    expect(isStale('2026-10-13', '2027-01-12')).toBe(true);
  });

  test('RULE-09 counts calendar days on the viewer’s local date, late in the evening too', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-12T23:59:00'));
    expect(staleToday('2026-10-13')).toBe(true);
    vi.setSystemTime(new Date('2027-01-11T23:59:00'));
    expect(staleToday('2026-10-13')).toBe(false);
  });

  test('RULE-09 a note dated ahead of the viewer (time-zone gap) is not stale', () => {
    expect(isStale('2026-10-14', '2026-10-13')).toBe(false);
  });
});

describe('RULE-04 changelog on the Now page', () => {
  test('F010_AC4 a tool added in March and updated in May appears in May as updated and March as added, May first', async () => {
    const months = changelog([tool('regex', 'Regex Tester', '2026-03-05', '2026-05-12')]);
    expect(months).toEqual([
      { month: '2026-05', items: [{ id: 'regex', name: 'Regex Tester', type: 'updated', date: '2026-05-12' }] },
      { month: '2026-03', items: [{ id: 'regex', name: 'Regex Tester', type: 'added', date: '2026-03-05' }] },
    ]);

    const html = await render(
      nowView({ now: note('2026-10-01'), tools: [tool('regex', 'Regex Tester', '2026-03-05', '2026-05-12')] }),
    );
    const may = html.indexOf('May 2026');
    const march = html.indexOf('March 2026');
    expect(may).toBeGreaterThan(-1);
    expect(march).toBeGreaterThan(may);
    // The label reads as one phrase, "Improved Regex Tester" / "Added Regex Tester", and the tool name links to the tool.
    const mayGroup = html.slice(may, march);
    // The kind is inside the link, so the two links' names differ: "Improved Regex Tester", "Added Regex Tester".
    expect(mayGroup).toMatch(
      /<a [^>]*href="\/t\/regex\/"[^>]*>\s*<span[^>]*>Improved<\/span>\s*<span[^>]*>Regex Tester<\/span>\s*<\/a>/,
    );
    expect(mayGroup).toContain('datetime="2026-05-12"');
    expect(html.slice(march)).toMatch(
      /<a [^>]*href="\/t\/regex\/"[^>]*>\s*<span[^>]*>Added<\/span>\s*<span[^>]*>Regex Tester<\/span>\s*<\/a>/,
    );
  });

  test('F-010 edge: a tool added and updated on the same day appears only as added', () => {
    expect(changelog([tool('same', 'Same Day', '2026-05-01', '2026-05-01')])).toEqual([
      { month: '2026-05', items: [{ id: 'same', name: 'Same Day', type: 'added', date: '2026-05-01' }] },
    ]);
  });

  test('RULE-06 hidden tools are left out of the changelog', async () => {
    const html = await render(
      nowView({
        now: note('2026-10-01'),
        tools: [tool('a', 'Shown', '2026-05-01'), tool('h', 'Secret', '2026-05-02', undefined, true)],
      }),
    );
    expect(html).toContain('Shown');
    expect(html).not.toContain('Secret');
  });
});

describe('SCR-Now states', () => {
  test('F010_AC1 the note and its machine-readable date are shown, with no stale label in the static page', async () => {
    const html = await render(nowView({ now: note('2026-10-13'), tools: [tool('a', 'Shown', '2026-05-01')] }));
    expect(html).toMatch(/<h1[^>]*>What I&#39;m up to<\/h1>|<h1[^>]*>What I'm up to<\/h1>/);
    expect(html).toMatch(/<p[^>]*>First paragraph.<\/p>/);
    expect(html).toMatch(/<p[^>]*>Second paragraph.<\/p>/);
    expect(html).toMatch(/<time[^>]*datetime="2026-10-13"[^>]*>/);
    expect(html).toContain('Updated');
    expect(html).toContain('Oct 13, 2026');
    // Read in full by assistive technology (SCR-Now accessibility).
    expect(html).toContain('October 13, 2026');
    expect(html).not.toContain('I wrote this a while ago');
    // Both sections: the changelog is below the note's heading level.
    expect(html).toMatch(/<h2[^>]*>What I(&#39;|')ve shipped<\/h2>/);
  });

  test('F010_AC5 with no Now note and two visible tools, only the changelog is shown', async () => {
    const r = fixture('F010_AC5-no-now-note');
    expect(r.now).toBeUndefined();
    expect(r.visibleTools).toHaveLength(2);
    const view = nowView({ now: r.now, tools: r.allTools });
    expect(view.note).toBeUndefined();
    expect(view.empty).toBe(false);
    const html = await render(view);
    expect(html).not.toMatch(/What I(&#39;|')m up to/);
    expect(html).not.toContain('Updated');
    expect(html).not.toContain('Nothing to share yet');
    // The changelog is the page's only section, so its title is the page heading.
    expect(html).toMatch(/<h1[^>]*>What I(&#39;|')ve shipped<\/h1>/);
    expect(html).toContain('Color Picker');
    expect(html).toContain('Regex Tester');
  });

  test('F010_AC6 with no Now note and no visible tools, the empty state is shown', async () => {
    const r = fixture('F010_AC6-no-note-no-tools');
    expect(r.now).toBeUndefined();
    const view = nowView({ now: r.now, tools: r.allTools });
    expect(view.empty).toBe(true);
    const html = await render(view);
    expect(html).toMatch(/<h1[^>]*>What I(&#39;|')m up to<\/h1>/);
    expect(html).toContain('class="tk-state"');
    expect(html).toContain('Nothing to share yet. Check back soon.');
    expect(html).not.toMatch(/What I(&#39;|')ve shipped/);
  });

  test('F-010.R4 a Now note with no visible tools shows the note and no changelog', async () => {
    const html = await render(nowView({ now: note('2026-10-13'), tools: [] }));
    expect(html).toContain('First paragraph.');
    expect(html).not.toMatch(/What I(&#39;|')ve shipped/);
    expect(html).not.toContain('Nothing to share yet');
  });
});

describe('MOD-Copy placeholders on SCR-Now', () => {
  test('a copy string split around its placeholder fails clearly when the placeholder is missing', () => {
    expect(around('Added \u0000!')).toEqual({ before: 'Added ', after: '!' });
    expect(() => around('Added a tool')).toThrow(/placeholder/);
  });
});
