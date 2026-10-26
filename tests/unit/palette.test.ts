// F-004 Search with the command palette: the pure parts of MOD-Search (`searchPalette`) and MOD-Palette
// (the empty-query view, running a result, the shortcut, highlighting) and MOD-Backup's export (F-004.R5).
// End-to-end behavior (dialog, focus, keyboard, clipboard) is in tests/e2e/palette.spec.ts.
import { describe, expect, test, vi } from 'vitest';
import { backupFile, backupFileName, exportBackup } from '../../src/modules/backup/index.ts';
import {
  COPIED_MS,
  emptyQueryGroups,
  isApplePlatform,
  isPaletteShortcut,
  matchRange,
  PALETTE_FAVORITES_MAX,
  paletteBootstrap,
  paletteIndex,
  paletteView,
  resultCountText,
  runEntry,
  type ActionId,
  type PageItem,
  type PaletteEntry,
  type RunEnvironment,
  type ToolEntry,
} from '../../src/modules/palette/logic.ts';
import type { Loc } from '../../src/modules/language/languages.ts';
import { paletteText } from '../../src/modules/palette/text.ts';
import { emptyDocument, type PersonalData } from '../../src/modules/personal-data/index.ts';
import { PALETTE_GROUP_MAX, PALETTE_GROUPS, searchPalette, searchKeys } from '../../src/modules/search/index.ts';

// Plain strings stand for texts that are the same in both languages (MOD-Language `Text`); the palette's types ask
// for both versions, so the fixtures are cast.
const tool = (id: string, name: string, extra: { summary?: string; tags?: string[]; linked?: boolean } = {}) =>
  ({
    id,
    name,
    summary: extra.summary ?? '',
    tags: extra.tags ?? [],
    openMode: extra.linked ? ('linked' as const) : ('embedded' as const),
    url: `https://${id}.example.com/`,
    keys: searchKeys({ name, summary: extra.summary ?? '', tags: extra.tags }),
  }) as unknown as ToolEntry;
const PAGES = [
  { id: 'home', name: 'Home', path: '/' },
  { id: 'tools', name: 'Tools', path: '/tools/' },
  { id: 'about', name: 'About me', path: '/about/' },
  { id: 'now', name: 'Now', path: '/now/' },
  { id: 'settings', name: 'Settings', path: '/settings/' },
] as unknown as PageItem[];
const ACTIONS = {
  theme: 'Toggle light/dark theme',
  language: 'Switch to Tiếng Việt',
  export: 'Export your data',
  copy: 'Copy link to this page',
} as unknown as Record<ActionId, string> & Record<ActionId, Loc>;

const doc = (favorites: string[], recents: string[]): PersonalData => ({
  ...emptyDocument(),
  favorites: favorites.map((toolId, i) => ({ toolId, pinnedAt: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString() })),
  recents: recents.map((toolId, i) => ({
    toolId,
    openedAt: new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString(),
  })),
});
const names = (items: readonly { name: unknown }[]) => items.map((i) => i.name);
const groupSummary = (groups: readonly { id: string; items: readonly { name: unknown }[] }[]) =>
  groups.map((g) => [g.id, names(g.items)] as const);

describe('MOD-Search searchPalette (F-004.R3, RULE-05)', () => {
  const index = {
    tools: [tool('units', 'Unit Converter'), tool('json', 'JSON Formatter', { tags: ['json'] })],
    pages: PAGES.map((p) => ({ ...p, keys: searchKeys(p) })),
    actions: [{ id: 'theme', name: ACTIONS.theme }],
  };

  test('F004_AC4 one tool "Tomato Timer", "to": Tools, Pages, Actions in that order, the theme action first', () => {
    const one = paletteIndex({ tools: [tool('tomato', 'Tomato Timer')] }, PAGES, ACTIONS);
    expect(groupSummary(searchPalette('to', one))).toEqual([
      ['tools', ['Tomato Timer']],
      ['pages', ['Tools']],
      ['actions', [ACTIONS.theme, ACTIONS.copy, ACTIONS.language]],
    ]);
  });

  test('F004_AC9 "zzzz" gives no groups at all (the no-results state)', () => {
    expect(searchPalette('zzzz', index)).toEqual([]);
  });

  test('F-004.R3 groups keep the order Tools, Pages, Actions, each ranked by RULE-05', () => {
    const all = {
      tools: [tool('a', 'Toggle board'), tool('b', 'Gadget', { summary: 'toggles things' })],
      pages: [{ id: 'tools', name: 'Tools', path: '/tools/' }],
      actions: [{ id: 'theme', name: ACTIONS.theme }],
    };
    const groups = searchPalette('to', all);
    expect(groups.map((g) => g.id)).toEqual(['tools', 'pages', 'actions']);
    expect(PALETTE_GROUPS).toEqual(['tools', 'pages', 'actions']);
    // Within a group: name prefix beats summary contains (RULE-05).
    expect(names(searchPalette('toggle', all)[0]!.items)).toEqual(['Toggle board', 'Gadget']);
  });

  test('RULE-05 each palette group shows at most 8 results, the best ones', () => {
    const many = Array.from({ length: 12 }, (_, i) => tool(`t${i}`, `Tool ${String(i).padStart(2, '0')}`));
    const exact = tool('exact', 'Tool');
    const groups = searchPalette('tool', { tools: [...many, exact], pages: [], actions: [] });
    expect(PALETTE_GROUP_MAX).toBe(8);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items).toHaveLength(8);
    expect(groups[0]!.items[0]!.id).toBe('exact');
  });

  test('RULE-05 favorites break ties in the tools group only (favorites are tool ids)', () => {
    const index2 = {
      tools: [tool('a', 'Alpha tool'), tool('b', 'Beta tool')],
      pages: [
        { id: 'a', name: 'Alpha topic', path: '/a/' },
        { id: 'b', name: 'Beta topic', path: '/b/' },
      ].map((p) => ({
        ...p,
        keys: searchKeys(p),
      })),
      actions: [],
    };
    // "t": every name contains it at the same tier, so the tie-break decides.
    const tie = searchPalette('t', index2, { favorites: ['b'] });
    expect(names(tie[0]!.items)).toEqual(['Beta tool', 'Alpha tool']);
    expect(names(tie[1]!.items)).toEqual(['Alpha topic', 'Beta topic']);
  });

  test('F-004.R3 a blank query searches nothing', () => {
    expect(searchPalette('   ', index)).toEqual([]);
  });
});

describe('MOD-Palette empty query (F-004.R2, RULE-01)', () => {
  const tools = ['a', 'b', 'c', 'd', ...Array.from({ length: 12 }, (_, i) => `x${i}`)].map((id) =>
    tool(id, `Tool ${id.toUpperCase()}`),
  );
  const index = paletteIndex({ tools }, PAGES, ACTIONS);

  test('F004_AC3 favorites A and B, recents B, C and D: Favorites A, B, then Recents C, D, then Pages', () => {
    const groups = emptyQueryGroups(index, doc(['a', 'b'], ['b', 'c', 'd']));
    expect(groups.map((g) => [g.id, g.items.map((i) => i.id)])).toEqual([
      ['favorites', ['a', 'b']],
      ['recents', ['c', 'd']],
      ['pages', ['home', 'tools', 'about', 'now', 'settings']],
    ]);
  });

  test('F-004.R2 favorites are capped at 8 in pin order; recents at 8, newest first, favorites left out', () => {
    const favs = tools.slice(0, 10).map((t) => t.id);
    const recents = tools.map((t) => t.id).reverse();
    const groups = emptyQueryGroups(index, doc(favs, recents));
    expect(PALETTE_FAVORITES_MAX).toBe(8);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(favs.slice(0, 8));
    const shownRecents = groups[1]!.items.map((i) => i.id);
    expect(shownRecents).toHaveLength(6);
    expect(shownRecents.some((id) => favs.includes(id))).toBe(false);
  });

  test('RULE-06 hidden or unknown tools in favorites and recents never show; empty groups are left out', () => {
    const groups = emptyQueryGroups(index, doc(['gone'], ['hidden-tool']));
    expect(groups.map((g) => g.id)).toEqual(['pages']);
  });

  test('F-004 edge case: with no catalog data, the empty query still offers the pages', () => {
    const noData = paletteIndex(null, PAGES, ACTIONS);
    expect(emptyQueryGroups(noData, doc(['a'], ['c'])).map((g) => g.id)).toEqual(['pages']);
    expect(paletteView('them', noData, doc([], [])).map((g) => g.id)).toEqual(['actions']);
  });

  test('F-004.R3 a query switches to the query groups, with favorites breaking tool ties', () => {
    const view = paletteView('tool', index, doc(['x3'], []));
    expect(view[0]!.id).toBe('tools');
    expect(view[0]!.items[0]!.id).toBe('x3');
    expect(view[0]!.items).toHaveLength(8);
  });
});

describe('MOD-Palette running a result (F-004.R4, R5)', () => {
  const env = (over: Partial<RunEnvironment> = {}) => {
    const calls: string[] = [];
    const e: RunEnvironment = {
      close: () => calls.push('close'),
      openTool: (t) => calls.push(`open:${t.id}`),
      assign: (p) => calls.push(`assign:${p}`),
      toggleTheme: () => calls.push('theme'),
      switchLanguage: () => calls.push('language'),
      exportData: async () => void calls.push('export'),
      copy: async (text) => void calls.push(`copy:${text}`),
      href: () => 'https://tarokit.test/t/json/',
      ...over,
    };
    return { e, calls };
  };
  const index = paletteIndex(
    { tools: [tool('units', 'Unit Converter', { linked: true }), tool('tab', 'Tab Tamer')] },
    PAGES,
    ACTIONS,
  );
  const find = (kind: PaletteEntry['kind'], id: string) =>
    [...index.tools, ...index.pages, ...index.actions].find((x) => x.kind === kind && x.id === id)!;

  test('F004_AC5 "ab" shows Tab Tamer, then About; Down once and Enter goes to the About page', async () => {
    const flat = paletteView('ab', index, emptyDocument()).flatMap((g) => g.items);
    expect(names(flat)).toEqual(['Tab Tamer', 'About me']);
    const { e, calls } = env();
    expect(await runEntry(flat[1]!, e)).toBe('closed');
    expect(calls).toEqual(['close', 'assign:/about/']);
  });

  test('F-004.R4 running a tool opens it as in F-003; running a page goes to it', async () => {
    const { e, calls } = env();
    await runEntry(find('tool', 'units'), e);
    await runEntry(find('page', 'settings'), e);
    expect(calls).toEqual(['close', 'open:units', 'close', 'assign:/settings/']);
  });

  test('F004_AC6 the toggle-theme action toggles the theme and closes the palette', async () => {
    const { e, calls } = env();
    expect(await runEntry(find('action', 'theme'), e)).toBe('closed');
    expect(calls).toEqual(['close', 'theme']);
  });

  test('F019_AC6 F-004.R5 the switch-language action switches the language and closes the palette', async () => {
    const { e, calls } = env();
    expect(await runEntry(find('action', 'language'), e)).toBe('closed');
    expect(calls).toEqual(['close', 'language']);
  });

  test('F004_AC7 the export action exports the backup, then closes the palette', async () => {
    const { e, calls } = env();
    expect(await runEntry(find('action', 'export'), e)).toBe('closed');
    expect(calls).toEqual(['export', 'close']);
  });

  test('F-004 edge case: a failed export keeps the palette open and reports it', async () => {
    const { e, calls } = env({ exportData: () => Promise.reject(new Error('chunk failed')) });
    expect(await runEntry(find('action', 'export'), e)).toBe('exportFailed');
    expect(calls).toEqual([]);
  });

  test('F004_AC8 copy-address copies the page address and asks for the confirmation before closing', async () => {
    const { e, calls } = env();
    expect(await runEntry(find('action', 'copy'), e)).toBe('copied');
    expect(calls).toEqual(['copy:https://tarokit.test/t/json/']);
    expect(COPIED_MS).toBeGreaterThan(0);
  });

  test('F-004.R5 when the clipboard refuses, copy-address closes without the confirmation', async () => {
    const { e, calls } = env({ copy: () => Promise.reject(new Error('denied')) });
    expect(await runEntry(find('action', 'copy'), e)).toBe('closed');
    expect(calls).toEqual(['close']);
  });
});

describe('MOD-Backup export, reused by the palette (F-004.R5, F-013.R1)', () => {
  const now = new Date(2026, 9, 13, 23, 30);
  test('F004_AC7 the backup file holds the personal data, a schema version and the export time', () => {
    const data = doc(['a'], ['b']);
    const file = backupFile(data, now);
    expect(file).toEqual({ format: 'tarokit-backup', exportedAt: now.toISOString(), data });
    expect(file.data.schemaVersion).toBe(2);
  });
  test('F004_AC7 the file is named with the local date and saved through a download', () => {
    expect(backupFileName(now)).toBe('tarokit-backup-2026-10-13.json');
    const download = vi.fn();
    const data = doc([], ['c']);
    exportBackup(now, { snapshot: () => data, download });
    expect(download).toHaveBeenCalledTimes(1);
    const [name, json] = download.mock.calls[0]!;
    expect(name).toBe('tarokit-backup-2026-10-13.json');
    expect(JSON.parse(json)).toEqual(backupFile(data, now));
  });
});

describe('MOD-Palette shortcut and bootstrap (F-004.R1)', () => {
  test('F-004.R1 Command on Apple platforms, Control elsewhere', () => {
    expect(isApplePlatform({ userAgentData: { platform: 'macOS' } })).toBe(true);
    expect(isApplePlatform({ platform: 'iPhone' })).toBe(true);
    expect(isApplePlatform({ platform: 'MacIntel' })).toBe(true);
    expect(isApplePlatform({ platform: 'Win32' })).toBe(false);
    expect(isApplePlatform({ userAgentData: { platform: 'Linux' }, platform: 'Linux x86_64' })).toBe(false);
    const key = (k: string, mods: Partial<KeyboardEvent> = {}) =>
      ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods }) as KeyboardEvent;
    expect(isPaletteShortcut(key('k', { metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key('K', { metaKey: true }), true)).toBe(true);
    expect(isPaletteShortcut(key('k', { ctrlKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key('k', { ctrlKey: true }), false)).toBe(true);
    expect(isPaletteShortcut(key('k', { ctrlKey: true, altKey: true }), false)).toBe(false);
    expect(isPaletteShortcut(key('j', { ctrlKey: true }), false)).toBe(false);
    // Mod+Shift+K is another shortcut (browsers and tools use it), never the palette.
    expect(isPaletteShortcut(key('K', { metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isPaletteShortcut(key('K', { ctrlKey: true, shiftKey: true }), false)).toBe(false);
  });
  test('NFR-02 the inline bootstrap stays small (under 2 KB before compression) and carries the shortcut logic', () => {
    expect(paletteBootstrap.length).toBeLessThan(2048);
    expect(paletteBootstrap).toContain('showModal');
    expect(() => new Function(paletteBootstrap)).not.toThrow();
  });
});

describe('MOD-Palette match highlight (CMP-CommandPalette rows)', () => {
  test('marks the matched part of the name, ignoring case and diacritics', () => {
    expect(matchRange('JSON Formatter', 'json')).toEqual([0, 4]);
    expect(matchRange('Unit Converter', 'conv')).toEqual([5, 9]);
    expect(matchRange('Đồng hồ', 'dong')).toEqual([0, 4]);
    expect(matchRange('Base64', 'zzz')).toBeUndefined();
    expect(matchRange('Base64', '  ')).toBeUndefined();
  });
});

describe('MOD-Palette in both languages (F-019.R2, R4, R5)', () => {
  const text = paletteText({ resume: undefined });
  const summary = { 'en-US': 'Format and validate JSON.', 'vi-VN': 'Định dạng và kiểm tra JSON.' };
  const tools = [{ ...tool('json', 'JSON Formatter'), summary, keys: searchKeys({ name: 'JSON Formatter', summary }) }];
  const index = paletteIndex({ tools }, text.pages, text.actions, text.languageKeywords);
  const ids = (groups: { items: { id: string }[] }[]) => groups.flatMap((g) => g.items.map((i) => i.id));

  test('F-004.R5 the actions are theme, switch language, export and copy, in that order', () => {
    expect(index.actions.map((a) => a.id)).toEqual(['theme', 'language', 'export', 'copy']);
  });

  test('F-004.R5 F-019.R2 each version of the switch-language action names the other language', () => {
    expect(text.actions.language).toEqual({ 'en-US': 'Switch to Tiếng Việt', 'vi-VN': 'Chuyển sang English' });
  });

  test('F019_AC19 with Vietnamese showing, "settings" lists the page Cài đặt', () => {
    const groups = paletteView('settings', index, emptyDocument());
    const page = groups.find((g) => g.id === 'pages')!.items[0]!;
    expect(page.id).toBe('settings');
    expect((page.name as Record<string, string>)['vi-VN']).toBe('Cài đặt');
  });

  test('F019_AC19 F-004.R5 "ngôn ngữ", "language", "english" and "Tiếng Việt" list the switch-language action', () => {
    // The keywords are COPY-settings.language and the two language names, in both languages (no literals).
    expect(text.languageKeywords).toEqual(['Language', 'Ngôn ngữ', 'English', 'Tiếng Việt']);
    for (const q of ['ngôn ngữ', 'ngon ngu', 'language', 'english', 'Tiếng Việt'])
      expect(ids(paletteView(q, index, emptyDocument())), q).toContain('language');
  });

  test('F019_AC9 "dinh dang" with English showing lists the tool by its Vietnamese summary and name', () => {
    const groups = paletteView('dinh dang', index, emptyDocument());
    expect(ids(groups)).toEqual(['json']);
  });

  test('F019_AC21 three results are announced as "3 kết quả" with Vietnamese showing', () => {
    expect(resultCountText(3, text.count, 'vi-VN')).toBe('3 kết quả');
    expect(resultCountText(3, text.count, 'en-US')).toBe('3 results');
    expect(resultCountText(1, text.count, 'en-US')).toBe(text.count.one['en-US']);
    expect(resultCountText(0, text.count, 'vi-VN')).toBe('');
  });
});
