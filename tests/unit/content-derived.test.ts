// MOD-Content derived views: every consumer of the registry (F-001.R1, F-001.R4, RULE-04, RULE-06).
// Consumers that later features render (catalog, category pages, search and palette, home, changelog,
// site index, tool view) are checked here at the derived-data level they will read.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  catalogData,
  categoryPath,
  changelog,
  loadRegistry,
  type Registry,
  sitemapEntries,
  toolPath,
  toolsByCategory,
  visibleCategories,
  visibleTools,
} from '../../src/modules/content/index.ts';
import { whatsNew } from '../../src/modules/pages/whats-new.ts';

const root = join(import.meta.dirname, '../..');
const fixtures = join(root, 'tests/fixtures/content');
const tmpDirs: string[] = [];

function load(overlay?: string): Registry {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-content-'));
  tmpDirs.push(dir);
  const contentDir = join(dir, 'content');
  cpSync(join(fixtures, 'valid'), contentDir, { recursive: true });
  if (overlay) cpSync(join(fixtures, overlay), contentDir, { recursive: true });
  return loadRegistry({ root, contentDir });
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** Every place an entry id can surface, read from the registry and the derived views (RULE-06's list). */
function surfaces(r: Registry, today: string) {
  const data = catalogData(r);
  return {
    catalog: visibleTools(r.allTools).map((t) => t.id),
    categoryPages: visibleCategories(r.categories, r.allTools).flatMap((c) =>
      toolsByCategory(r.allTools, c.id).map((t) => t.id),
    ),
    searchAndPalette: [...data.tools, ...data.projects].map((e) => e.id),
    home: whatsNew(r.allTools, today).map((i) => i.id),
    changelog: changelog(r.allTools).flatMap((m) => m.items.map((i) => i.id)),
    projects: [...r.projects, ...data.projects].map((p) => p.id),
    siteIndex: sitemapEntries(r),
    toolView: r.allTools.filter((t) => r.toolById(t.id)).map((t) => t.id),
  };
}

describe('F-001 consumers', () => {
  it('F001_AC1 a new tool entry appears in every consumer and has a tool view, with no other edits', () => {
    const today = '2026-10-14'; // the fixture's added date, seen on the same local date
    const before = load();
    expect(visibleCategories(before.categories, before.allTools).map((c) => c.id)).not.toContain('media');

    const r = load('F001_AC1-new-tool');
    const s = surfaces(r, today);
    expect(s.catalog).toContain('clip-maker');
    expect(visibleCategories(r.categories, r.allTools).map((c) => c.id)).toContain('media');
    expect(toolsByCategory(r.allTools, 'media').map((t) => t.id)).toEqual(['clip-maker']);
    expect(s.searchAndPalette).toContain('clip-maker');
    expect(catalogData(r).categories.map((c) => c.id)).toContain('media');
    expect(whatsNew(r.allTools, today)[0]).toEqual({
      id: 'clip-maker',
      name: 'Clip Maker',
      type: 'added',
      date: '2026-10-14',
    });
    expect(changelog(r.allTools)[0]).toEqual({
      month: '2026-10',
      items: [{ id: 'clip-maker', name: 'Clip Maker', type: 'added', date: '2026-10-14' }],
    });
    expect(r.changelogEvents[0]).toMatchObject({ id: 'clip-maker', type: 'added' });
    expect(s.siteIndex).toContain(toolPath('clip-maker'));
    expect(s.siteIndex).toContain(categoryPath('media'));
    expect(toolPath('clip-maker')).toBe('/t/clip-maker/');
    expect(r.toolById('clip-maker')?.openMode).toBe('embedded');
    expect(r.embeddedOrigins).toContain('https://clip.tarokit.app');
  });

  it('F001_AC4 an own tool with no open mode opens embedded in the registry and the catalog data', () => {
    const r = load();
    expect(r.toolById('json')?.openMode).toBe('embedded');
    expect(catalogData(r).tools.find((t) => t.id === 'json')?.openMode).toBe('embedded');
    expect(r.embeddedOrigins).toContain('https://json.tarokit.app');
  });

  it('F001_AC6 a hidden tool and a hidden project appear in none of the consumers', () => {
    const r = load('F001_AC6-hidden-entries');
    // Both hidden entries are loaded and valid; they are only kept out of every view.
    expect(r.allTools.map((t) => t.id)).toContain('secret');
    // Seen 6 days after the hidden tool was added, inside the what's new window.
    const s = surfaces(r, '2026-02-10');
    for (const [surface, ids] of Object.entries(s)) {
      for (const id of ['secret', 'secret-game']) {
        expect(ids, `${surface} lists ${id}`).not.toContain(id);
        expect(ids, `${surface} links ${id}`).not.toContain(toolPath(id));
      }
    }
    // The hidden tool's category (media) has no visible tools, so it has no page (RULE-06).
    expect(visibleCategories(r.categories, r.allTools).map((c) => c.id)).not.toContain('media');
    expect(s.siteIndex).not.toContain(categoryPath('media'));
    expect(catalogData(r).categories.map((c) => c.id)).not.toContain('media');
    expect(r.toolById('secret')).toBeUndefined();
    // The visible project still shows, so the hidden one is left out for being hidden.
    expect(s.projects).toContain('blog');
  });
});

const tool = (id: string, added: string, updated?: string, hidden = false) => ({
  id,
  name: id.toUpperCase(),
  category: 'developer',
  added,
  updated,
  hidden,
});

describe('RULE-04 changelog', () => {
  it('RULE-04 lists one added and one updated item per tool, newest first, grouped by month', () => {
    const months = changelog([tool('json', '2026-03-02', '2026-05-20'), tool('units', '2026-05-01')]);
    expect(months).toEqual([
      {
        month: '2026-05',
        items: [
          { id: 'json', name: 'JSON', type: 'updated', date: '2026-05-20' },
          { id: 'units', name: 'UNITS', type: 'added', date: '2026-05-01' },
        ],
      },
      { month: '2026-03', items: [{ id: 'json', name: 'JSON', type: 'added', date: '2026-03-02' }] },
    ]);
  });

  it('RULE-04 orders same-date items by name', () => {
    const items = changelog([
      tool('beta', '2026-05-01'),
      tool('alpha', '2026-05-01', '2026-05-01'),
      tool('gamma', '2026-04-01', '2026-05-01'),
    ])[0].items;
    // alpha was added and updated the same day, so it appears only as added (F-010 edge case).
    expect(items.map((i) => `${i.id}:${i.type}`)).toEqual(['alpha:added', 'beta:added', 'gamma:updated']);
  });

  it('RULE-04 leaves projects out of the changelog', () => {
    const r = load();
    expect(r.changelogEvents.map((e) => e.id)).not.toContain('blog');
  });
});

describe('derived views', () => {
  it('RULE-06 an empty catalog has no visible categories and only the public pages in the site index', () => {
    expect(visibleCategories([{ id: 'developer', order: 1 }], [])).toEqual([]);
    expect(sitemapEntries({ categories: [], allTools: [] })).toEqual([
      '/',
      '/tools/',
      '/projects/',
      '/about/',
      '/now/',
    ]);
  });

  it('lists visible tools alphabetically and categories in display order', () => {
    const r = load();
    expect(visibleTools(r.allTools).map((t) => t.name)).toEqual(['Excalidraw', 'JSON Formatter', 'Units']);
    expect(
      visibleCategories(
        [
          { id: 'b', order: 2 },
          { id: 'a', order: 1 },
        ],
        [
          { ...tool('x', '2026-01-01'), category: 'b' },
          { ...tool('y', '2026-01-01'), category: 'a' },
        ],
      ).map((c) => c.id),
    ).toEqual(['a', 'b']);
  });
});
