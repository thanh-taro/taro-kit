// MOD-Search: the pure RULE-05 ranking core and the catalog search on top of it (F-002.R4).
// RULE-05: exact name, then name prefix, then name contains, then tag match, then summary contains; ties go to
// favorites first, then name alphabetically; matching ignores case and diacritics; no fuzzy matching.
import { describe, expect, test } from 'vitest';
import {
  compareRanked,
  filterCatalog,
  matchTier,
  normalize,
  rank,
  searchKeys,
  TIERS,
} from '../../src/modules/search/index.ts';

const entry = (id: string, name: string, summary = '', tags: string[] = []) => ({ id, name, summary, tags });
const ids = (list: { id: string }[]) => list.map((x) => x.id);
const rankedIds = (list: { item: { id: string } }[]) => list.map((r) => r.item.id);

describe('RULE-05 normalization', () => {
  test('RULE-05 ignores case', () => {
    expect(normalize('JSON Formatter')).toBe('json formatter');
  });
  test('RULE-05 ignores diacritics, including Vietnamese tones and đ/Đ, which do not decompose', () => {
    expect(normalize('Nguyễn Trí Thành')).toBe('nguyen tri thanh');
    expect(normalize('Đồng hồ đếm ngược')).toBe('dong ho dem nguoc');
    expect(normalize('Crème Brûlée')).toBe('creme brulee');
  });
  test('RULE-05 trims and collapses whitespace so a stray space does not change the match', () => {
    expect(normalize('  json \t  formatter ')).toBe('json formatter');
    expect(normalize('   ')).toBe('');
  });
  test('RULE-05 search keys are the normalized name, tags and summary', () => {
    expect(searchKeys({ name: 'Ảnh Resizer', summary: 'Resize ÉTÉ images', tags: ['Ảnh', 'IMG'] })).toEqual({
      name: ['anh resizer'],
      tags: ['anh', 'img'],
      summary: ['resize ete images'],
    });
    expect(searchKeys({ name: 'Base64' })).toEqual({ name: ['base64'], tags: [], summary: [] });
  });
  test('F-019.R5 RULE-05 search keys hold every distinct version of the name and summary', () => {
    const keys = searchKeys({
      name: { 'en-US': 'Settings', 'vi-VN': 'Cài đặt' },
      summary: { 'en-US': 'Format JSON.', 'vi-VN': 'Định dạng JSON.' },
    });
    expect(keys).toEqual({ name: ['settings', 'cai dat'], tags: [], summary: ['format json.', 'dinh dang json.'] });
    expect(searchKeys({ name: { 'en-US': 'JSON', 'vi-VN': 'JSON' } }).name).toEqual(['json']);
  });
  test('F-019.R5 RULE-05 ADR-0012 the best tier across both languages wins, and name ties sort the same in both languages', () => {
    const list = [
      { ...entry('a', 'x'), name: { 'en-US': 'Apple', 'vi-VN': 'Táo' } },
      { ...entry('b', 'x'), name: { 'en-US': 'Tangerine', 'vi-VN': 'Quýt' } },
    ];
    // "ta" is a prefix of Táo (Vietnamese) and of Tangerine (English): one tier, so the name decides.
    // Ties sort by the one-version (en-US) name, so the order never changes on a switch.
    expect(rankedIds(rank('ta', list))).toEqual(['a', 'b']); // Apple, Tangerine
    // "Đa…" before "De…" in English collation (Vietnamese collation would put Đ after D).
    const twins = [entry('d', 'Đa tool'), entry('e', 'De tool')].reverse();
    expect(rankedIds(rank('tool', twins))).toEqual(['d', 'e']);
  });
});

describe('RULE-05 match tiers', () => {
  const keys = searchKeys({ name: 'JSON Formatter', summary: 'Pretty-print and validate data.', tags: ['lint'] });
  test('RULE-05 tiers are in rule order', () => {
    expect(TIERS).toEqual(['exact', 'prefix', 'contains', 'tag', 'summary']);
  });
  test('RULE-05 exact name, prefix, contains, tag and summary each match at their tier', () => {
    expect(matchTier('json formatter', keys)).toBe('exact');
    expect(matchTier('json', keys)).toBe('prefix');
    expect(matchTier('format', keys)).toBe('contains');
    expect(matchTier('lin', keys)).toBe('tag');
    expect(matchTier('validate', keys)).toBe('summary');
  });
  test('RULE-05 the best tier wins when several apply', () => {
    // "json" is a prefix of the name and also a tag: the name prefix counts.
    expect(matchTier('json', searchKeys({ name: 'JSON Tools', tags: ['json'], summary: 'json' }))).toBe('prefix');
  });
  test('RULE-05 a tag matches when it starts with the query, not when the query is in its middle', () => {
    expect(matchTier('enc', searchKeys({ name: 'B', tags: ['encoding'] }))).toBe('tag');
    expect(matchTier('coding', searchKeys({ name: 'B', tags: ['encoding'] }))).toBeUndefined();
  });
  test('RULE-05 there is no fuzzy matching: a typo or reordered letters match nothing', () => {
    expect(matchTier('jsno', keys)).toBeUndefined();
    expect(matchTier('fromatter', keys)).toBeUndefined();
  });
  test('RULE-05 an empty query matches nothing', () => {
    expect(matchTier('', keys)).toBeUndefined();
  });
});

describe('RULE-05 rank', () => {
  const items = [
    entry('summary', 'Zeta', 'Converts a unit of length.'),
    entry('tag', 'Yak', 'Nothing here.', ['units']),
    entry('contains', 'Metric Unit Tool', 'x'),
    entry('prefix', 'Unit Converter', 'x'),
    entry('exact', 'Unit', 'x'),
    entry('none', 'Color Picker', 'Pick colors.'),
  ];

  test('RULE-05 orders exact, prefix, contains, tag, then summary, and leaves non-matches out', () => {
    const ranked = rank('unit', items);
    expect(rankedIds(ranked)).toEqual(['exact', 'prefix', 'contains', 'tag', 'summary']);
    expect(ranked.map((r) => r.tier)).toEqual(['exact', 'prefix', 'contains', 'tag', 'summary']);
  });

  test('RULE-05 ties go to favorites first, then by name alphabetically', () => {
    const tied = [
      entry('c', 'Clock Delta'),
      entry('a', 'Clock Alpha'),
      entry('b', 'Clock Bravo'),
      entry('d', 'Clock Charlie'),
    ];
    expect(rankedIds(rank('clock', tied))).toEqual(['a', 'b', 'd', 'c']);
    const ranked = rank('clock', tied, { favorites: ['c', 'd'] });
    expect(rankedIds(ranked)).toEqual(['d', 'c', 'a', 'b']);
    expect(ranked.map((r) => r.favorite)).toEqual([true, true, false, false]);
  });

  test('RULE-05 a favorite never jumps a better tier', () => {
    const list = [entry('fav', 'Base Unit Helper', 'x'), entry('plain', 'Unit Base', 'x')];
    expect(rankedIds(rank('unit', list, { favorites: new Set(['fav']) }))).toEqual(['plain', 'fav']);
  });

  test('RULE-05 matching ignores case and diacritics on both sides', () => {
    const list = [entry('vn', 'Đồng hồ', 'Hẹn giờ'), entry('fr', 'Crème', 'x')];
    expect(rankedIds(rank('DONG', list))).toEqual(['vn']);
    expect(rankedIds(rank('hen gio', list))).toEqual(['vn']);
    expect(rankedIds(rank('crème', list))).toEqual(['fr']);
    expect(rankedIds(rank('CREME', list))).toEqual(['fr']);
  });

  test('RULE-05 uses pre-normalized keys when an item carries them (the catalog data file)', () => {
    // The keys say "alpha", the display name says otherwise: ranking reads the keys only.
    const withKeys = [{ ...entry('k', 'Display Name'), keys: { name: ['alpha'], tags: [], summary: [''] } }];
    expect(rankedIds(rank('alpha', withKeys))).toEqual(['k']);
    expect(rankedIds(rank('display', withKeys))).toEqual([]);
  });

  test('RULE-05 a blank query ranks nothing', () => {
    expect(rank('', items)).toEqual([]);
    expect(rank('   ', items)).toEqual([]);
  });

  test('RULE-05 does not change its input and is stable for equal items', () => {
    const list = [entry('b', 'Same'), entry('a', 'Same')];
    const copy = structuredClone(list);
    expect(rankedIds(rank('same', list))).toEqual(['b', 'a']);
    expect(list).toEqual(copy);
  });

  test('RULE-05 compareRanked is the order rank uses, for callers that merge or cap groups', () => {
    const ranked = rank('unit', items, { favorites: ['tag'] });
    expect([...ranked].reverse().sort(compareRanked)).toEqual(ranked);
  });

  test('NFR-02 ranking 500 entries takes well under one keystroke budget', () => {
    const many = Array.from({ length: 500 }, (_, i) =>
      entry(`t${i}`, `Tool number ${i}`, `Summary for tool ${i} with words.`, ['alpha', `tag${i}`]),
    );
    const indexed = many.map((m) => ({ ...m, keys: searchKeys(m) }));
    const start = performance.now();
    for (const q of ['t', 'to', 'too', 'tool', 'tool n', 'words', 'tag4']) rank(q, indexed, { favorites: ['t3'] });
    // Seven keystrokes; NFR-02 allows 50 ms for each one on the reference device.
    expect(performance.now() - start).toBeLessThan(7 * 50);
  });
});

describe('F-002 catalog search (filterCatalog)', () => {
  const tools = [
    { ...entry('json', 'JSON Formatter', 'Pretty-print and validate JSON.', ['json']), category: 'developer' },
    { ...entry('b64', 'Base64', 'Encode and decode Base64 text and images.', ['encoding']), category: 'developer' },
    { ...entry('resize', 'Image Resizer', 'Make pictures smaller.'), category: 'media' },
    { ...entry('clip', 'Clip Maker', 'Short clips from videos.'), category: 'media' },
  ];

  test('F002_AC5 typing "json" lists "JSON Formatter" and not "Base64"', () => {
    const result = filterCatalog('json', tools);
    expect(result.map((t) => t.name)).toContain('JSON Formatter');
    expect(result.map((t) => t.name)).not.toContain('Base64');
  });

  test('F002_AC6 matches from two categories come back as one ranked list, each keeping its category', () => {
    const result = filterCatalog('image', tools);
    // Image Resizer (media) is a name prefix; Base64 (developer) matches in its summary.
    expect(ids(result)).toEqual(['resize', 'b64']);
    expect(result.map((t) => t.category)).toEqual(['media', 'developer']);
  });

  test('F002_AC6 favorites break ties within a tier', () => {
    const twins = [
      { ...entry('x', 'Image A'), category: 'media' },
      { ...entry('y', 'Image B'), category: 'developer' },
    ];
    expect(ids(filterCatalog('image', twins))).toEqual(['x', 'y']);
    expect(ids(filterCatalog('image', twins, { favorites: ['y'] }))).toEqual(['y', 'x']);
  });

  test('F002_AC7 a query with no matches returns an empty list', () => {
    expect(filterCatalog('pdf', tools)).toEqual([]);
  });

  test('F002_AC5 returns the tool objects themselves, in ranked order', () => {
    const [first] = filterCatalog('json formatter', tools);
    expect(first).toBe(tools[0]);
  });
});
