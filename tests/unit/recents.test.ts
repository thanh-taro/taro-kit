// F-006 Track recent tools: RULE-01 (recents), RULE-13 (days used) and INV-04 as pure functions over the
// MOD-PersonalData document, the store's commands and signals with a fixed clock, and the visit recording in
// MOD-ToolHost (openTool and the linked-visit listener).
import { describe, expect, test, vi } from 'vitest';
import {
  clearRecentVisits,
  createPersonalDataStore,
  DAYS_USED_LIMIT,
  daysUsedInLast14,
  daysUsedWindow,
  emptyDocument,
  RECENTS_LIMIT,
  RECENTS_SHOWN,
  recordDayUsed,
  recordRecentVisit,
  STORAGE_KEY,
  visibleRecents,
  type PersonalData,
} from '../../src/modules/personal-data/index.ts';
import { localDate } from '../../src/modules/personal-data/dates.ts';
import { openTool } from '../../src/modules/tool-host/index.ts';
import { visitTarget } from '../../src/modules/tool-host/visits.ts';
import { FakeStorage } from './fakes.ts';

const T = (n: number) => new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString();
const withRecents = (ids: string[], favorites: string[] = []): PersonalData => ({
  ...emptyDocument(),
  recents: ids.map((toolId, i) => ({ toolId, openedAt: T(100 - i) })),
  favorites: favorites.map((toolId, i) => ({ toolId, pinnedAt: T(i) })),
});
const ids = (doc: Pick<PersonalData, 'recents'>) => doc.recents.map((r) => r.toolId);
const tid = (n: number) => `t${String(n).padStart(2, '0')}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => tid(from + i));

describe('RULE-01 recents (pure)', () => {
  test('F006_AC4 opening C from recents A, B, C moves it to the top with no duplicate', () => {
    const doc = recordRecentVisit(withRecents(['a', 'b', 'c']), 'c', T(200));
    expect(ids(doc)).toEqual(['c', 'a', 'b']);
    expect(doc.recents[0]).toEqual({ toolId: 'c', openedAt: T(200) });
  });

  test('F006_AC5 with 20 stored, a new tool goes first and the oldest entry is removed', () => {
    const doc = recordRecentVisit(withRecents(range(1, 20)), 'new', T(200));
    expect(RECENTS_LIMIT).toBe(20);
    expect(doc.recents).toHaveLength(20);
    expect(ids(doc)[0]).toBe('new');
    expect(ids(doc)).not.toContain(tid(20));
    expect(ids(doc).slice(1)).toEqual(range(1, 19));
  });

  test('RULE-01 entries for unknown or hidden tools count toward the 20', () => {
    const stored = [...range(1, 18), 'hidden', 'gone'];
    const doc = recordRecentVisit(withRecents(stored), 'new', T(200));
    expect(doc.recents).toHaveLength(20);
    // The oldest entry goes, whatever the tool's visibility: the hidden one stays, the unknown oldest is dropped.
    expect(ids(doc)).toContain('hidden');
    expect(ids(doc)).not.toContain('gone');
  });

  test('RULE-01 recording never mutates the input document', () => {
    const before = withRecents(['a', 'b']);
    const copy = structuredClone(before);
    recordRecentVisit(before, 'b', T(200));
    expect(before).toEqual(copy);
  });

  test('F006_AC7 clearing recents empties them and keeps the rest of the document', () => {
    const doc = { ...withRecents(['a', 'b'], ['x']), daysUsed: ['2026-10-14'] };
    const cleared = clearRecentVisits(doc);
    expect(cleared.recents).toEqual([]);
    expect(cleared.favorites).toEqual(doc.favorites);
    expect(cleared.daysUsed).toEqual(['2026-10-14']);
  });

  test('F006_AC8 a hidden recent is not shown, and reappears in its original position once visible', () => {
    const doc = withRecents(['a', 'b', 'c']);
    expect(visibleRecents(doc, ['a', 'c']).map((r) => r.toolId)).toEqual(['a', 'c']);
    expect(visibleRecents(doc, ['a', 'b', 'c']).map((r) => r.toolId)).toEqual(['a', 'b', 'c']);
  });

  test('RULE-01 shown lists hold at most 8 and leave out favorites', () => {
    const doc = withRecents(range(1, 12), [tid(2), tid(5)]);
    const visible = range(1, 12);
    expect(RECENTS_SHOWN).toBe(8);
    const shown = visibleRecents(doc, visible).map((r) => r.toolId);
    expect(shown).toEqual([tid(1), tid(3), tid(4), tid(6), tid(7), tid(8), tid(9), tid(10)]);
    // The options: favorites kept, and another cap.
    expect(visibleRecents(doc, visible, { excludeFavorites: false, max: 3 }).map((r) => r.toolId)).toEqual(range(1, 3));
  });

  test('INV-04 unknown ids are filtered at read time, never removed from storage', () => {
    const doc = withRecents(['gone', 'a']);
    expect(visibleRecents(doc, ['a']).map((r) => r.toolId)).toEqual(['a']);
    expect(ids(doc)).toEqual(['gone', 'a']);
  });
});

describe('RULE-13 days used (pure)', () => {
  test('RULE-13 records each distinct local date once, newest first', () => {
    let doc = recordDayUsed(emptyDocument(), '2026-10-12');
    doc = recordDayUsed(doc, '2026-10-14');
    const again = recordDayUsed(doc, '2026-10-14');
    expect(again).toBe(doc);
    expect(doc.daysUsed).toEqual(['2026-10-14', '2026-10-12']);
  });

  test('RULE-13 keeps the latest 60 dates', () => {
    const days = Array.from({ length: 60 }, (_, i) => localDate(new Date(2026, 7, 1 + i)));
    const doc = recordDayUsed({ ...emptyDocument(), daysUsed: [...days].reverse() }, '2026-10-14');
    expect(DAYS_USED_LIMIT).toBe(60);
    expect(doc.daysUsed).toHaveLength(60);
    expect(doc.daysUsed[0]).toBe('2026-10-14');
    expect(doc.daysUsed).not.toContain(days[0]);
  });

  test('RULE-13 the clock moving backward records the date as it is, and never twice', () => {
    let doc = { ...emptyDocument(), daysUsed: ['2026-10-14', '2026-10-13'] };
    doc = recordDayUsed(doc, '2026-10-10');
    expect(doc.daysUsed).toEqual(['2026-10-14', '2026-10-13', '2026-10-10']);
    expect(recordDayUsed(doc, '2026-10-13')).toBe(doc);
  });

  test('F006_AC9 3 distinct days in the last 14 and others before that count as 3', () => {
    const daysUsed = ['2026-10-14', '2026-10-09', '2026-10-01', '2026-09-30', '2026-09-01', '2026-08-15'];
    expect(daysUsedInLast14(daysUsed, '2026-10-14')).toBe(3);
  });

  test('RULE-13 the 14-day window includes today and 13 days back, not 14, and not future dates', () => {
    expect(daysUsedInLast14(['2026-10-14'], '2026-10-14')).toBe(1);
    expect(daysUsedInLast14(['2026-10-01'], '2026-10-14')).toBe(1);
    expect(daysUsedInLast14(['2026-09-30'], '2026-10-14')).toBe(0);
    expect(daysUsedInLast14(['2026-10-15'], '2026-10-14')).toBe(0);
    // Across a month and a year boundary.
    expect(daysUsedInLast14(['2025-12-20', '2026-01-02'], '2026-01-02')).toBe(2);
  });

  test('RULE-13 the window strip marks the used days, oldest first and today last', () => {
    const strip = daysUsedWindow(['2026-10-14', '2026-10-01', '2026-09-30'], '2026-10-14');
    expect(strip).toHaveLength(14);
    expect(strip[0]).toBe(true);
    expect(strip[13]).toBe(true);
    expect(strip.filter(Boolean)).toHaveLength(2);
  });

  test('RULE-13 the local date comes from the local calendar, never UTC', () => {
    expect(localDate(new Date(2026, 9, 14, 23, 59))).toBe('2026-10-14');
    expect(localDate(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02');
  });
});

describe('MOD-PersonalData store: recents and days used (ADR-0010)', () => {
  const make = (storage = new FakeStorage(), now = new Date(2026, 9, 14, 9, 30)) =>
    createPersonalDataStore({ storage: () => storage, now: () => now });

  test('F006_AC4 recordVisit moves the tool to the top and the signals follow', () => {
    const store = make();
    const seen: string[][] = [];
    store.recents.subscribe((r) => seen.push(r.map((v) => v.toolId)));
    for (const id of ['c', 'b', 'a', 'c']) store.recordVisit(id);
    expect(seen.at(-1)).toEqual(['c', 'a', 'b']);
    expect(store.recents.value[0]!.openedAt).toBe(new Date(2026, 9, 14, 9, 30).toISOString());
  });

  test('F006_AC6 recents persist on the device and are read back by a new page', () => {
    const storage = new FakeStorage();
    const first = make(storage);
    first.recordVisit('b');
    first.recordVisit('a');
    const later = make(storage);
    expect(later.recents.value.map((r) => r.toolId)).toEqual(['a', 'b']);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recents.map((r: { toolId: string }) => r.toolId)).toEqual([
      'a',
      'b',
    ]);
  });

  test('F006_AC7 clearRecents empties the stored recents', () => {
    const storage = new FakeStorage();
    const store = make(storage);
    store.recordVisit('a');
    store.clearRecents();
    expect(store.recents.value).toEqual([]);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recents).toEqual([]);
  });

  test('F006_AC8 visibleRecents hides hidden tools and leaves out favorites, reactively', () => {
    const store = make();
    for (const id of ['c', 'b', 'a']) store.recordVisit(id);
    const shown = store.visibleRecents(['a', 'c']);
    expect(shown.value.map((r) => r.toolId)).toEqual(['a', 'c']);
    store.pin('a', ['a', 'c']);
    expect(shown.value.map((r) => r.toolId)).toEqual(['c']);
    store.unpin('a');
    expect(store.visibleRecents(['a', 'b', 'c']).value.map((r) => r.toolId)).toEqual(['a', 'b', 'c']);
  });

  test('F006_AC9 recordDay records today once and daysUsedLast14 counts the window', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyDocument(), daysUsed: ['2026-10-10', '2026-10-05', '2026-09-20', '2026-08-01'] }),
    );
    const store = make(storage);
    expect(store.daysUsedLast14.value).toBe(2);
    store.recordDay();
    store.recordDay();
    expect(store.data.value.daysUsed).toEqual(['2026-10-14', '2026-10-10', '2026-10-05', '2026-09-20', '2026-08-01']);
    expect(store.daysUsedLast14.value).toBe(3);
  });

  test('RULE-13 recordDay writes nothing when today is already recorded', () => {
    const storage = new FakeStorage();
    const store = make(storage);
    store.recordDay();
    const spy = vi.spyOn(storage, 'setItem');
    store.recordDay();
    expect(spy).not.toHaveBeenCalled();
  });

  test('F-005.R5 with storage unavailable, recents and days work in memory for the session', () => {
    const store = createPersonalDataStore({ storage: () => null, now: () => new Date(2026, 9, 14) });
    store.recordVisit('a');
    store.recordDay();
    expect(store.storageAvailable.value).toBe(false);
    expect(store.recents.value.map((r) => r.toolId)).toEqual(['a']);
    expect(store.daysUsedLast14.value).toBe(1);
  });

  test('F-005 edge case: another window recording a visit shows here (last write wins)', () => {
    const storage = new FakeStorage();
    const events = new EventTarget();
    const here = createPersonalDataStore({ storage: () => storage, events: events as unknown as Window });
    const there = make(storage);
    there.recordVisit('z');
    events.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }));
    expect(here.recents.value.map((r) => r.toolId)).toEqual(['z']);
  });
});

describe('F-006.R1 visit recording in MOD-ToolHost', () => {
  const env = () => ({ open: vi.fn(), assign: vi.fn(), record: vi.fn() });

  test('F006_AC1 openTool on a linked tool opens its address in a new tab and records the visit', () => {
    const e = env();
    openTool({ id: 'gh', openMode: 'linked', url: 'https://github.com/' }, e);
    expect(e.open).toHaveBeenCalledWith('https://github.com/', '_blank', 'noopener,noreferrer');
    expect(e.record).toHaveBeenCalledWith('gh');
  });

  test('F-006.R1 openTool on an embedded tool only navigates: the tool view records the visit', () => {
    const e = env();
    openTool({ id: 'json', openMode: 'embedded', url: 'https://json.tarokit.app/' }, e);
    expect(e.assign).toHaveBeenCalledWith('/t/json/');
    expect(e.record).not.toHaveBeenCalled();
  });

  test('F-006.R1 the link listener finds the tool a followed link opens', () => {
    const link = (attrs: Record<string, string>, parent?: Record<string, string>) => {
      const el = {
        getAttribute: (n: string) => attrs[n] ?? null,
        closest: (sel: string) => {
          if (sel === 'a[href]') return el;
          if (sel === '[data-tk-visit-links]' && parent) return { getAttribute: (n: string) => parent[n] ?? null };
          return null;
        },
      };
      return el as unknown as Element;
    };
    expect(visitTarget(link({ href: 'https://x/', 'data-tk-visit': 'gh' }))).toBe('gh');
    expect(visitTarget(link({ href: 'https://x/' }, { 'data-tk-visit-links': 'gh' }))).toBe('gh');
    expect(visitTarget(link({ href: '/t/json/' }))).toBeNull();
  });
});
