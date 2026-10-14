// MOD-PersonalData favorites: RULE-02 and INV-04 as pure functions, and the store commands (F-005).
import { effect } from '@preact/signals';
import { describe, expect, test } from 'vitest';
import { visibleTools } from '../../src/modules/content/derive.ts';
import {
  createPersonalDataStore,
  emptyDocument,
  FAVORITES_LIMIT,
  isFavorite,
  pinFavorite,
  STORAGE_KEY,
  unpinFavorite,
  visibleFavorites,
  type PersonalData,
} from '../../src/modules/personal-data/index.ts';
import { claimStorageNotice, resetStorageNoticeForTests } from '../../src/modules/shell/StorageNotice.tsx';
import { FakeStorage } from './fakes.ts';

const fx = (n: number) => `fx-${String(n).padStart(2, '0')}`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => fx(from + i));
const at = (i: number) => new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString();
const docWith = (ids: string[]): PersonalData => ({
  ...emptyDocument(),
  favorites: ids.map((toolId, i) => ({ toolId, pinnedAt: at(i) })),
});
const ids = (doc: Pick<PersonalData, 'favorites'>) => doc.favorites.map((f) => f.toolId);

// Visibility comes from MOD-Content's registry function, as in the browser (INV-04, RULE-06).
const catalog = [
  ...range(1, 30).map((id) => ({ id, name: id, category: 'developer', hidden: false })),
  { id: 'fx-hidden', name: 'fx-hidden', category: 'developer', hidden: true },
];
const VISIBLE = new Set(visibleTools(catalog).map((t) => t.id));
const NOW = '2026-10-14T09:00:00.000Z';

const storeWith = (favoriteIds: string[], storage = new FakeStorage()) => {
  storage.setItem(STORAGE_KEY, JSON.stringify(docWith(favoriteIds)));
  return { store: createPersonalDataStore({ storage: () => storage }), storage };
};
const storedIds = (storage: FakeStorage) => ids(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null'));

describe('RULE-02 pin', () => {
  test('RULE-02 the limit is 24', () => {
    expect(FAVORITES_LIMIT).toBe(24);
  });

  test('RULE-02 a new favorite is appended, so the list stays in pin order (oldest first)', () => {
    const { result, doc } = pinFavorite(docWith(['fx-03', 'fx-01']), 'fx-02', VISIBLE, NOW);
    expect(result).toBe('ok');
    expect(ids(doc)).toEqual(['fx-03', 'fx-01', 'fx-02']);
    expect(doc.favorites.at(-1)).toEqual({ toolId: 'fx-02', pinnedAt: NOW });
  });

  test('RULE-02 pinning a favorite again changes nothing', () => {
    const before = docWith(['fx-01']);
    const { result, doc } = pinFavorite(before, 'fx-01', VISIBLE, NOW);
    expect(result).toBe('ok');
    expect(doc).toBe(before);
  });

  test('RULE-02 a 25th visible favorite is refused and nothing changes', () => {
    const before = docWith(range(1, 24));
    const { result, doc } = pinFavorite(before, 'fx-25', VISIBLE, NOW);
    expect(result).toBe('full');
    expect(doc).toBe(before);
  });

  test('RULE-02 favorites for hidden or unknown tools do not count toward the limit', () => {
    // 22 visible, 1 hidden, 1 unknown: 24 stored, so pinning drops the oldest of those two.
    const before = docWith(['gone', ...range(1, 11), 'fx-hidden', ...range(12, 22)]);
    const { result, doc } = pinFavorite(before, 'fx-23', VISIBLE, NOW);
    expect(result).toBe('ok');
    expect(ids(doc)).toEqual([...range(1, 11), 'fx-hidden', ...range(12, 23)]);
    expect(doc.favorites).toHaveLength(24);
  });

  test('RULE-02 storage never holds more than 24: the oldest hidden or unknown entry goes first', () => {
    const before = docWith(['fx-hidden', 'gone', ...range(1, 22)]);
    const first = pinFavorite(before, 'fx-23', VISIBLE, NOW);
    expect(ids(first.doc)).toEqual(['gone', ...range(1, 23)]);
    const second = pinFavorite(first.doc, 'fx-24', VISIBLE, NOW);
    expect(ids(second.doc)).toEqual(range(1, 24));
    expect(pinFavorite(second.doc, 'fx-25', VISIBLE, NOW).result).toBe('full');
  });

  test('RULE-02 below 24 stored, hidden favorites are kept when pinning', () => {
    const { doc } = pinFavorite(docWith(['fx-hidden', 'fx-01']), 'fx-02', VISIBLE, NOW);
    expect(ids(doc)).toEqual(['fx-hidden', 'fx-01', 'fx-02']);
  });

  test('RULE-02 the input document is never mutated', () => {
    const before = docWith(['fx-hidden', ...range(1, 23)]);
    const copy = structuredClone(before);
    pinFavorite(before, 'fx-24', VISIBLE, NOW);
    expect(before).toEqual(copy);
  });

  test('RULE-02 unpin removes only that favorite; an unknown id changes nothing', () => {
    const before = docWith(['fx-01', 'fx-02', 'fx-03']);
    expect(ids(unpinFavorite(before, 'fx-02'))).toEqual(['fx-01', 'fx-03']);
    expect(unpinFavorite(before, 'nope')).toBe(before);
  });
});

describe('INV-04 reading favorites', () => {
  test('INV-04 hidden and unknown favorites are never shown, and keep their place in storage', () => {
    const doc = docWith(['fx-02', 'fx-hidden', 'gone', 'fx-01']);
    expect(ids({ favorites: visibleFavorites(doc.favorites, VISIBLE) })).toEqual(['fx-02', 'fx-01']);
    expect(ids(doc)).toEqual(['fx-02', 'fx-hidden', 'gone', 'fx-01']);
  });

  test('INV-04 a stored favorite reappears, in its place, once its tool is visible again', () => {
    const doc = docWith(['fx-01', 'fx-02', 'fx-03']);
    const without02 = visibleTools(catalog.map((t) => (t.id === 'fx-02' ? { ...t, hidden: true } : t))).map(
      (t) => t.id,
    );
    expect(ids({ favorites: visibleFavorites(doc.favorites, without02) })).toEqual(['fx-01', 'fx-03']);
    expect(ids({ favorites: visibleFavorites(doc.favorites, VISIBLE) })).toEqual(['fx-01', 'fx-02', 'fx-03']);
  });

  test('INV-04 isFavorite answers for stored favorites, visible or not', () => {
    const doc = docWith(['fx-hidden']);
    expect(isFavorite(doc, 'fx-hidden')).toBe(true);
    expect(isFavorite(doc, 'fx-01')).toBe(false);
  });
});

describe('F-005 store commands', () => {
  test('F005_AC1 pin writes through and every subscriber sees it at once', () => {
    const { store, storage } = storeWith([]);
    const seen: boolean[] = [];
    const stop = effect(() => void seen.push(store.isFavorite('fx-03')));
    const visible = store.visibleFavorites(VISIBLE);
    expect(store.pin('fx-03', VISIBLE)).toBe('ok');
    stop();
    expect(seen).toEqual([false, true]);
    expect(ids({ favorites: visible.value })).toEqual(['fx-03']);
    expect(storedIds(storage)).toEqual(['fx-03']);
  });

  test('F005_AC2 unpin removes it from the visible favorites and from storage', () => {
    const { store, storage } = storeWith(['fx-01', 'fx-02']);
    const visible = store.visibleFavorites(VISIBLE);
    store.unpin('fx-01');
    expect(ids({ favorites: visible.value })).toEqual(['fx-02']);
    expect(storedIds(storage)).toEqual(['fx-02']);
  });

  test('F005_AC3 three favorites come back in the same order from storage', () => {
    const storage = new FakeStorage();
    const first = createPersonalDataStore({ storage: () => storage });
    for (const id of ['fx-05', 'fx-02', 'fx-09']) first.pin(id, VISIBLE);
    first.dispose();
    const reopened = createPersonalDataStore({ storage: () => storage });
    expect(ids({ favorites: reopened.visibleFavorites(VISIBLE).value })).toEqual(['fx-05', 'fx-02', 'fx-09']);
  });

  test('F005_AC4 with 24 visible favorites, pin returns full and changes nothing', () => {
    const { store, storage } = storeWith(range(1, 24));
    const before = storage.getItem(STORAGE_KEY);
    expect(store.pin('fx-25', VISIBLE)).toBe('full');
    expect(store.isFavorite('fx-25')).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
  });

  test('F005_AC5 a hidden favorite is not listed, and is listed again when visible', () => {
    const { store } = storeWith(['fx-01', 'fx-02']);
    const hidden02 = [...VISIBLE].filter((id) => id !== 'fx-02');
    expect(ids({ favorites: store.visibleFavorites(hidden02).value })).toEqual(['fx-01']);
    expect(ids({ favorites: store.visibleFavorites(VISIBLE).value })).toEqual(['fx-01', 'fx-02']);
  });

  test('F005_AC6 with 23 visible and 1 hidden favorite, pinning drops the hidden one from storage', () => {
    const { store, storage } = storeWith(['fx-hidden', ...range(1, 23)]);
    expect(store.pin('fx-24', VISIBLE)).toBe('ok');
    expect(storedIds(storage)).toEqual(range(1, 24));
  });

  test('F005_AC7 with storage unavailable, pinning works in memory for the session', () => {
    const store = createPersonalDataStore({
      storage: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    expect(store.storageAvailable.value).toBe(false);
    expect(store.pin('fx-04', VISIBLE)).toBe('ok');
    expect(store.isFavorite('fx-04')).toBe(true);
    expect(ids({ favorites: store.visibleFavorites(VISIBLE).value })).toEqual(['fx-04']);
  });

  test('F-005 edge case: the last write from another window wins after focus', () => {
    const storage = new FakeStorage();
    const win = new EventTarget();
    const a = createPersonalDataStore({ storage: () => storage, events: win });
    const b = createPersonalDataStore({ storage: () => storage });
    a.pin('fx-01', VISIBLE);
    b.pin('fx-02', VISIBLE);
    win.dispatchEvent(new Event('focus'));
    expect(a.isFavorite('fx-01')).toBe(false);
    expect(a.isFavorite('fx-02')).toBe(true);
  });
});

describe('F-005.R5 one-time storage notice', () => {
  test('F005_AC7 the notice is claimed once per browser session', () => {
    const session = new FakeStorage();
    resetStorageNoticeForTests();
    expect(claimStorageNotice(() => session)).toBe(true);
    expect(claimStorageNotice(() => session)).toBe(false);
    // A new page in the same session: the session flag holds.
    resetStorageNoticeForTests();
    expect(claimStorageNotice(() => session)).toBe(false);
    // A new session.
    resetStorageNoticeForTests();
    expect(claimStorageNotice(() => new FakeStorage())).toBe(true);
  });

  test('F005_AC7 without sessionStorage the notice still shows at most once per page', () => {
    const refused = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    resetStorageNoticeForTests();
    expect(claimStorageNotice(refused)).toBe(true);
    expect(claimStorageNotice(refused)).toBe(false);
    resetStorageNoticeForTests();
    expect(claimStorageNotice(refused)).toBe(true);
  });
});
