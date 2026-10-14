// MOD-PersonalData store (ADR-0010): one versioned document, write-through, repair on read,
// in-memory fallback, cross-window sync.
import { describe, expect, test } from 'vitest';
import {
  createPersonalDataStore,
  emptyDocument,
  normalizeDocument,
  parseDocument,
  STORAGE_KEY,
} from '../../src/modules/personal-data/index.ts';
import { FakeStorage } from './fakes.ts';

const stored = (s: FakeStorage) => JSON.parse(s.getItem(STORAGE_KEY) ?? 'null');

describe('document (ADR-0010, RULE-08 defaults)', () => {
  test('nothing stored yields the defaults with schemaVersion 1', () => {
    expect(parseDocument(null)).toEqual({
      schemaVersion: 1,
      favorites: [],
      recents: [],
      preferences: { theme: 'system' },
      daysUsed: [],
    });
  });

  test('unparsable text yields the defaults', () => {
    expect(parseDocument('{nope')).toEqual(emptyDocument());
  });

  test('keeps valid parts and fills the rest with defaults', () => {
    const doc = normalizeDocument({
      schemaVersion: 99,
      favorites: [{ toolId: 'json', pinnedAt: '2026-10-01T00:00:00Z' }, { toolId: 3 }, 'x'],
      recents: 'not a list',
      preferences: { theme: 'neon' },
      daysUsed: ['2026-10-01', 'yesterday', '2026-10-01'],
    });
    expect(doc).toEqual({
      schemaVersion: 1,
      favorites: [{ toolId: 'json', pinnedAt: '2026-10-01T00:00:00Z' }],
      recents: [],
      preferences: { theme: 'system' },
      daysUsed: ['2026-10-01'],
    });
  });

  test('drops duplicate tool ids and caps lists at the schema limits', () => {
    const favorites = Array.from({ length: 30 }, (_, i) => ({ toolId: `t${i % 26}`, pinnedAt: 'x' }));
    expect(normalizeDocument({ favorites }).favorites).toHaveLength(24);
    const recents = [
      { toolId: 'a', openedAt: '1' },
      { toolId: 'a', openedAt: '2' },
    ];
    expect(normalizeDocument({ recents }).recents).toEqual([{ toolId: 'a', openedAt: '1' }]);
  });
});

describe('store (ADR-0010)', () => {
  test('reads the stored document synchronously', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { theme: 'dark' } }));
    const store = createPersonalDataStore({ storage: () => storage });
    expect(store.storageAvailable.value).toBe(true);
    expect(store.preferences.value.theme).toBe('dark');
  });

  test('every mutation writes through the whole document', () => {
    const storage = new FakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyDocument(), favorites: [{ toolId: 'json', pinnedAt: '2026-10-01T00:00:00Z' }] }),
    );
    const store = createPersonalDataStore({ storage: () => storage });
    store.setTheme('light');
    expect(stored(storage)).toEqual({
      ...emptyDocument(),
      favorites: [{ toolId: 'json', pinnedAt: '2026-10-01T00:00:00Z' }],
      preferences: { theme: 'light' },
    });
    expect(store.data.value.preferences.theme).toBe('light');
  });

  test('update notifies subscribers once and snapshot is a copy', () => {
    const store = createPersonalDataStore({ storage: () => new FakeStorage() });
    const seen: string[] = [];
    const stop = store.preferences.subscribe((p) => seen.push(p.theme ?? '?'));
    store.update((doc) => ({ ...doc, daysUsed: ['2026-10-14'] }));
    store.setTheme('dark');
    stop();
    expect(seen).toEqual(['system', 'system', 'dark']);
    const snap = store.snapshot();
    snap.daysUsed.push('2026-10-15');
    expect(store.data.value.daysUsed).toEqual(['2026-10-14']);
  });

  test('an invalid stored document is repaired and rewritten without throwing', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{"preferences":{"theme":"dark"},"favorites":"oops"}');
    const store = createPersonalDataStore({ storage: () => storage });
    expect(store.data.value).toEqual({ ...emptyDocument(), preferences: { theme: 'dark' } });
    expect(stored(storage)).toEqual({ ...emptyDocument(), preferences: { theme: 'dark' } });
  });

  test('picks up writes from other windows on the storage event and on focus', () => {
    const storage = new FakeStorage();
    const win = new EventTarget();
    const store = createPersonalDataStore({ storage: () => storage, events: win });
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { theme: 'light' } }));
    win.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }));
    expect(store.preferences.value.theme).toBe('light');
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { theme: 'dark' } }));
    win.dispatchEvent(new Event('focus'));
    expect(store.preferences.value.theme).toBe('dark');
    store.dispose();
    storage.setItem(STORAGE_KEY, JSON.stringify(emptyDocument()));
    win.dispatchEvent(new Event('focus'));
    expect(store.preferences.value.theme).toBe('dark');
  });
});

describe('store when storage is unavailable (ADR-0010 in-memory fallback)', () => {
  test('a throwing localStorage getter gives a working session-only store', () => {
    const store = createPersonalDataStore({
      storage: () => {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    expect(store.storageAvailable.value).toBe(false);
    expect(store.preferences.value.theme).toBe('system');
    store.setTheme('dark');
    expect(store.preferences.value.theme).toBe('dark');
  });

  test('a store whose probe write fails is not used at all', () => {
    const storage = new FakeStorage();
    storage.map.set(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { theme: 'light' } }));
    storage.failWrites = true;
    const store = createPersonalDataStore({ storage: () => storage });
    expect(store.storageAvailable.value).toBe(false);
    store.setTheme('dark');
    expect(store.preferences.value.theme).toBe('dark');
    expect(stored(storage).preferences.theme).toBe('light');
  });

  test('a write that fails later switches to memory for the rest of the session', () => {
    const storage = new FakeStorage();
    const store = createPersonalDataStore({ storage: () => storage });
    storage.failWrites = true;
    store.setTheme('dark');
    expect(store.storageAvailable.value).toBe(false);
    expect(store.preferences.value.theme).toBe('dark');
    storage.failWrites = false;
    store.setTheme('light');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('a null storage (no localStorage at all) also falls back', () => {
    const store = createPersonalDataStore({ storage: () => null });
    expect(store.storageAvailable.value).toBe(false);
    store.update((d) => ({ ...d, daysUsed: ['2026-10-14'] }));
    expect(store.snapshot().daysUsed).toEqual(['2026-10-14']);
  });
});
