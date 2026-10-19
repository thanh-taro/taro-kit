// F-007 Home dashboard: the build-time home view (MOD-Pages home.ts, categoryRow), the greeting period and the
// before-first-paint prediction of the personal sections (home/inline.ts).
// The rendered page and its islands are covered end to end in tests/e2e/home.spec.ts.
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadRegistry } from '../../src/modules/content/index.ts';
import { categoryRow } from '../../src/modules/pages/category.ts';
import { firstVisitText, homeIntro, homeView } from '../../src/modules/pages/home/home.ts';
import {
  greetingPeriod,
  homeClockScript,
  homeReserveScript,
  predictHome,
} from '../../src/modules/pages/home/inline.ts';
import {
  createPersonalDataStore,
  emptyDocument,
  isCalendarDate,
  isTimestamp,
  parseDocument,
  STORAGE_KEY,
  visibleFavorites,
  visibleRecents,
} from '../../src/modules/personal-data/index.ts';

const root = join(import.meta.dirname, '../..');
const prod = loadRegistry({ root, contentDir: join(root, 'content') });
const fixtureDir = join(root, 'tests/fixtures/content/F005-favorites');
const fixture = loadRegistry({ root, contentDir: fixtureDir });

describe('F-007.R1 greeting', () => {
  it('F007_AC1 08:30 is morning; the boundaries follow COPY-home.greeting*', () => {
    expect(greetingPeriod(8)).toBe('morning');
    expect(greetingPeriod(5)).toBe('morning');
    expect(greetingPeriod(11)).toBe('morning');
    expect(greetingPeriod(4)).toBe('evening');
    expect(greetingPeriod(18)).toBe('evening');
    expect(greetingPeriod(0)).toBe('evening');
  });

  it('F007_AC2 11:59 is still morning and 12:00 is afternoon, through 17:59', () => {
    expect(greetingPeriod(11)).toBe('morning');
    expect(greetingPeriod(12)).toBe('afternoon');
    expect(greetingPeriod(17)).toBe('afternoon');
  });

  it('F-007.R1 the clock script carries the three greetings and no personal data', () => {
    const script = homeClockScript();
    for (const g of ['Good morning', 'Good afternoon', 'Good evening']) expect(script).toContain(g);
    expect(script).not.toContain('localStorage');
  });
});

describe('F-007.R5 introduction', () => {
  it('F007_AC9 uses the nickname and the headline, around COPY-home.intro', () => {
    expect(homeIntro({ name: 'Nguyen Tri Thanh', nickname: 'Taro', headline: 'I build tools.' })).toEqual({
      before: "I'm ",
      name: 'Taro',
      after: '. I build tools.',
    });
  });

  it('F007_AC9 falls back to the full name without a nickname', () => {
    expect(homeIntro({ name: 'Nguyen Tri Thanh', headline: 'I build tools.' }).name).toBe('Nguyen Tri Thanh');
  });

  it('F007_AC9 the production view introduces the profile', () => {
    const view = homeView(prod, join(root, 'content'));
    expect(view.intro.name).toBe(prod.profile.nickname ?? prod.profile.name);
    expect(view.intro.after).toContain(prod.profile.headline);
  });
});

describe('F-007.R6 first-visit invitation', () => {
  it('F007_AC10 splits COPY-home.firstVisit around the shortcut, and keeps the touch text whole', () => {
    const text = firstVisitText();
    expect(text.keyboard.before).toBe(
      "New here? These are the tools I've built for work and life. Browse them, or press ",
    );
    expect(text.keyboard.after).toBe(" and I'll find anything for you.");
    expect(text.touch).toBe(
      "New here? These are the tools I've built for work and life. Browse them, or tap search and I'll find anything for you.",
    );
  });
});

describe('F-007.R7 browse by category', () => {
  const cat = (id: string, name: string, order: number, tint: 'violet' | 'mango' | 'sky' | 'mint') => ({
    id,
    name,
    order,
    tint,
  });
  const tool = (id: string, category: string, hidden = false) => ({ id, name: id, category, hidden });

  it('F007_AC11 shows Developer tools · 3 tools, then Media tools · 1 tool, and no empty category', () => {
    const categories = [
      cat('media', 'Media tools', 2, 'mango'),
      cat('developer', 'Developer tools', 1, 'violet'),
      cat('converters', 'Converters & calculators', 3, 'sky'),
      cat('productivity', 'Productivity & relax', 4, 'mint'),
    ];
    const tools = [
      tool('a', 'developer'),
      tool('b', 'developer'),
      tool('c', 'developer'),
      tool('d', 'media'),
      tool('e', 'converters', true),
    ];
    expect(categoryRow(categories, tools)).toEqual([
      { id: 'developer', name: 'Developer tools', tint: 'violet', href: '/tools/developer/', count: '3 tools' },
      { id: 'media', name: 'Media tools', tint: 'mango', href: '/tools/media/', count: '1 tool' },
    ]);
  });

  it('F007_AC11 the home view row matches the registry’s visible categories and counts', () => {
    const view = homeView(fixture, fixtureDir);
    const expected = fixture.categories
      .map((c) => ({ id: c.id, n: c.tools.filter((t) => !t.hidden).length }))
      .filter((c) => c.n > 0);
    expect(view.categories.map((c) => c.id)).toEqual(expected.map((c) => c.id));
    for (const c of view.categories) {
      const n = expected.find((e) => e.id === c.id)!.n;
      expect(c.count).toBe(n === 1 ? '1 tool' : `${n} tools`);
      expect(c.iconSvg).toContain('<svg');
    }
  });
});

describe('F-007.R4 what’s new candidates', () => {
  it('RULE-04 every visible tool is a candidate, with its dates’ text formatted once', () => {
    const view = homeView(fixture, fixtureDir);
    expect(view.whatsNew.tools.map((t) => t.id).sort()).toEqual(fixture.visibleTools.map((t) => t.id).sort());
    for (const t of view.whatsNew.tools) {
      expect(view.whatsNew.dates[t.added]).toMatchObject({ iso: t.added });
      if (t.updated) expect(view.whatsNew.dates[t.updated]).toMatchObject({ iso: t.updated });
    }
    expect(view.whatsNew.labels).toEqual({ added: 'Added', updated: 'Improved' });
  });
});

describe('F-007.R3 predicting the personal sections before first paint', () => {
  const storage = new Map<string, string>();
  afterEach(() => {
    storage.clear();
    vi.unstubAllGlobals();
  });
  const stub = (doc: unknown) => {
    storage.set(STORAGE_KEY, JSON.stringify(doc));
    vi.stubGlobal('localStorage', memoryStorage());
  };
  /** A working storage, as the store's write probe expects (setItem, then removeItem). */
  const memoryStorage = (overrides: Partial<Storage> = {}) => ({
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
    ...overrides,
  });
  const at = (i: number) => new Date(Date.UTC(2026, 9, 10, 12, 59 - i)).toISOString();
  const doc = (favorites: string[], recents: string[]) => ({
    ...emptyDocument(),
    favorites: favorites.map((toolId, i) => ({ toolId, pinnedAt: at(i) })),
    recents: recents.map((toolId, i) => ({ toolId, openedAt: at(i) })),
  });
  const ids = Array.from({ length: 30 }, (_, i) => `t-${i}`);
  const tools = Object.fromEntries(ids.map((id, i) => [id, [`Tool ${i}`, i % 2 ? 1 : 0] as [string, 0 | 1]]));
  const headings = { favorites: 'Your favorites', recents: 'Recently used' };

  it('F007_AC4 two favorites and no recents predict two favorites and no recents', () => {
    stub(doc(['t-1', 't-2'], []));
    expect(predictHome(ids)).toEqual({ favorites: ['t-1', 't-2'], recents: [] });
  });

  it('F007_AC5 twelve recents of which two are favorites predict the first 8 others', () => {
    const recents = ids.slice(0, 12);
    stub(doc(['t-0', 't-5'], recents));
    expect(predictHome(ids)).toEqual({
      favorites: ['t-0', 't-5'],
      recents: ['t-1', 't-2', 't-3', 't-4', 't-6', 't-7', 't-8', 't-9'],
    });
  });

  /** What MOD-PersonalData itself would show for the stored text: its parser, then its visibility rules. */
  const fromStore = (visible: string[]) => {
    const parsed = parseDocument(storage.get(STORAGE_KEY) ?? null);
    return {
      favorites: visibleFavorites(parsed.favorites, visible).map((f) => f.toolId),
      recents: visibleRecents(parsed, visible).map((r) => r.toolId),
    };
  };

  it('F-007.R3 agrees with MOD-PersonalData for hidden, unknown, duplicated and malformed entries', () => {
    const visible = ids.slice(0, 10);
    const raw = doc(['t-1', 't-20', 'unknown', 't-1'], ['t-2', 't-1', 't-21', 't-3', 't-2', 'BAD ID']);
    raw.recents.push({ toolId: 't-4', openedAt: 'yesterday' });
    stub(raw);
    expect(predictHome(visible)).toEqual(fromStore(visible));
    expect(predictHome(visible)).toEqual({ favorites: ['t-1'], recents: ['t-2', 't-3'] });
  });

  it('F-007.R3 agrees with MOD-PersonalData on timestamps: impossible dates, date-only and zone-less times', () => {
    const visible = ids.slice(0, 10);
    const raw = doc(['t-1'], ['t-2', 't-3', 't-4', 't-5', 't-6', 't-7', 't-8']);
    raw.favorites.push({ toolId: 't-9', pinnedAt: '2026-02-30T10:00:00Z' });
    raw.recents[0]!.openedAt = '2026-02-30T10:00:00Z';
    raw.recents[1]!.openedAt = '2026-10-10';
    raw.recents[2]!.openedAt = '2026-10-10T10:00:00';
    raw.recents[3]!.openedAt = '2026-10-10T10:00+07:00';
    raw.recents[4]!.openedAt = '2026-13-01T10:00:00Z';
    raw.recents[5]!.openedAt = '2026-10-10 10:00:00Z';
    stub(raw);
    expect(predictHome(visible)).toEqual(fromStore(visible));
    expect(predictHome(visible)).toEqual({ favorites: ['t-1'], recents: ['t-5', 't-8'] });
  });

  it('F-007.R3 nothing stored, unreadable text or refused storage predict the empty state', () => {
    const none = { favorites: [], recents: [] };
    vi.stubGlobal('localStorage', memoryStorage());
    expect(predictHome(ids)).toEqual(none);
    storage.set(STORAGE_KEY, '{nope');
    expect(predictHome(ids)).toEqual(none);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    expect(predictHome(ids)).toEqual(none);
  });

  it('F-007.R3 the shared timestamp check agrees with the calendar check', () => {
    for (const day of [
      '2026-02-28',
      '2026-02-29',
      '2028-02-29',
      '2026-02-30',
      '2026-04-31',
      '2026-12-31',
      '2026-00-10',
    ])
      expect(isTimestamp(`${day}T00:00:00Z`), day).toBe(isCalendarDate(day));
  });

  it('F-007.R3 lookups ignore inherited names: a tool with the id "constructor" is predicted like any other', () => {
    stub(doc(['constructor'], ['toString', 'constructor', 'valueof']));
    expect(predictHome(['constructor'])).toEqual({ favorites: ['constructor'], recents: [] });
    expect(predictHome(['valueof'])).toEqual({ favorites: [], recents: ['valueof'] });
    expect(predictHome([])).toEqual({ favorites: [], recents: [] });
  });

  it('F-007.R3 storage that refuses writes (full) predicts the empty session the island will show', () => {
    stub(doc(['t-1'], ['t-2']));
    vi.stubGlobal(
      'localStorage',
      memoryStorage({
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        },
      }),
    );
    expect(predictHome(ids)).toEqual({ favorites: [], recents: [] });
    // As the store sees it: the write probe fails, so it reads nothing and starts an empty session.
    const store = createPersonalDataStore({ storage: () => localStorage });
    expect(store.storageAvailable.value).toBe(false);
    expect(store.visibleFavorites(ids).value).toEqual([]);
    expect(store.visibleRecents(ids).value).toEqual([]);
    store.dispose();
  });

  it('F-007.R3 the reserve script is self-contained, reads the same storage key and escapes content', () => {
    const script = homeReserveScript({ a: ['A</script><b>', 0] }, headings);
    expect(script).toMatch(new RegExp(`["']${STORAGE_KEY.replace('.', '\\.')}["']`));
    expect(script).toContain('"a":["A\\u003c/script>\\u003cb>",0]');
    expect(script).not.toContain('</script>');
    expect(() => new Function(script)).not.toThrow();
  });

  describe('run as inlined against a small DOM', () => {
    interface Node {
      tag: string;
      className?: string;
      textContent?: string;
      attrs: Record<string, string>;
      children: Node[];
      setAttribute(k: string, v: string): void;
      appendChild(c: Node): void;
      querySelector?(s: string): Node;
    }
    const node = (tag: string): Node => ({
      tag,
      attrs: {},
      children: [],
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
      appendChild(c) {
        this.children.push(c);
      },
    });
    const run = (online: boolean, touch = false) => {
      const reserve = node('div');
      const region = { ...node('div'), querySelector: () => reserve };
      vi.stubGlobal('document', { getElementById: () => region, createElement: node });
      vi.stubGlobal('matchMedia', () => ({ matches: touch }));
      vi.stubGlobal('navigator', { onLine: online });
      new Function(homeReserveScript(tools, headings))();
      return { region, reserve };
    };
    const cards = (section: Node) => section.children.at(-1)!.children.map((li) => li.children[0]!);
    const name = (card: Node) => card.children[0]!.children[1]!.children[0]!.textContent;

    it('F-007.R3 marks the default state and adds one named placeholder card per item, in order', () => {
      stub(doc(['t-1', 't-2'], ['t-3', 't-1', 't-4']));
      const { region, reserve } = run(true);
      expect(region.attrs).toEqual({ 'data-state': 'default', 'data-input': 'keyboard' });
      expect(reserve.children.map((s) => [s.className, cards(s).map(name)])).toEqual([
        ['tk-favorites', ['Tool 1', 'Tool 2']],
        ['tk-recents', ['Tool 3', 'Tool 4']],
      ]);
      // Online, no card gets the unavailable line.
      expect(reserve.children.flatMap(cards).every((c) => c.children.length === 1)).toBe(true);
    });

    it('F-011.R3 starting offline, cards of tools that need the internet get the unavailable line', () => {
      stub(doc(['t-1', 't-2'], []));
      const { reserve } = run(false);
      const [one, two] = cards(reserve.children[0]!);
      expect(one!.children.at(-1)).toMatchObject({ className: 'tk-toolcard__unavailable' });
      expect(two!.children).toHaveLength(1);
    });

    it('F007_AC10 with nothing stored: the empty state, keyboard or touch, and no placeholders', () => {
      vi.stubGlobal('localStorage', { getItem: () => null });
      expect(run(true).region.attrs).toEqual({ 'data-state': 'empty', 'data-input': 'keyboard' });
      const touch = run(true, true);
      expect(touch.region.attrs).toEqual({ 'data-state': 'empty', 'data-input': 'touch' });
      expect(touch.reserve.children).toEqual([]);
    });
  });

  it('F-007.R1 F-007.R3 the inlined sources hold no line comments (they are collapsed onto one line)', () => {
    for (const script of [homeClockScript(), homeReserveScript(tools, headings)])
      expect(script).not.toMatch(/(^|[^:"'])\/\/ /);
  });
});
