// MOD-PersonalData: the on-device store for ENT-PersonalData (ADR-0010).
// - One versioned localStorage document; every mutation writes through the whole document.
// - Availability check at startup (probe key). When storage is unavailable, an in-memory store lasts
//   for the session (F-005.R5, F-012 edge case), and `storageAvailable` is false.
// - Other windows' writes arrive through the `storage` event and a re-read on `focus`.
// - Reactive signals (DEP-04), so every island updates at once (F-005.R1).
// Nothing here is ever sent over the network (INV-05).
import { batch, computed, signal, type ReadonlySignal } from '@preact/signals';
import {
  isFavorite,
  pinFavorite,
  unpinFavorite,
  visibleFavorites,
  type Favorite,
  type PinResult,
  type VisibleIds,
} from './favorites.ts';
import {
  normalizeDocument,
  parseDocument,
  SCHEMA_VERSION,
  STORAGE_KEY,
  storedSchemaVersion,
  type PersonalData,
  type ThemePreference,
} from './document.ts';

const PROBE_KEY = 'tarokit.probe';

/** The parts of the browser the store touches; injectable so tests can fake them. */
export interface StoreEnvironment {
  /** `localStorage`, or `null`/a throwing getter when the browser withholds it. */
  storage: () => Storage | null;
  /** Where `storage` and `focus` events arrive (the window); omitted means no cross-window sync. */
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

export interface PersonalDataStore {
  /** The whole document, always valid (normalized on read). */
  readonly data: ReadonlySignal<PersonalData>;
  readonly preferences: ReadonlySignal<PersonalData['preferences']>;
  /** False when the browser refuses storage: changes then last only for this session. */
  readonly storageAvailable: ReadonlySignal<boolean>;
  /** Every stored favorite in pin order, oldest first, including unknown or hidden tools (INV-04). */
  readonly favorites: ReadonlySignal<Favorite[]>;
  /**
   * The favorites that may be shown, in pin order (RULE-02, INV-04): pass the visible tool ids
   * (MOD-Content). Reactive: it updates on every pin and unpin, in every island (F-005.R1).
   */
  visibleFavorites(visibleIds: VisibleIds): ReadonlySignal<Favorite[]>;
  /** True when the tool is a stored favorite. Reading it inside a computed or effect subscribes to changes. */
  isFavorite(toolId: string): boolean;
  /**
   * RULE-02 pin with the visible tool ids: `full` refuses a 25th visible favorite and changes nothing;
   * otherwise the tool is appended, dropping the oldest unknown or hidden favorites first when storage
   * would exceed 24 (F-005.R3, F-005.R4). Works in memory when storage is unavailable (F-005.R5).
   */
  pin(toolId: string, visibleIds: VisibleIds): PinResult;
  unpin(toolId: string): void;
  /** Write-through mutation of the whole document (ADR-0010). The recipe must return a new document. */
  update(recipe: (current: PersonalData) => PersonalData): void;
  setTheme(theme: ThemePreference): void;
  /** A deep copy of the current document (for export, F-013). */
  snapshot(): PersonalData;
  /** Re-reads storage (another window may have written). */
  refresh(): void;
  /** Removes window listeners. */
  dispose(): void;
}

/** Returns the storage if a probe write and remove succeed, otherwise null (ADR-0010 availability check). */
function probe(env: StoreEnvironment): Storage | null {
  try {
    const storage = env.storage();
    if (!storage) return null;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

export function createPersonalDataStore(env: StoreEnvironment): PersonalDataStore {
  let storage = probe(env);
  const available = signal(storage !== null);

  let newerOnDisk = false;

  const read = (): PersonalData => {
    if (!storage) return data.peek();
    let text: string | null;
    try {
      text = storage.getItem(STORAGE_KEY);
    } catch {
      return data.peek();
    }
    const doc = parseDocument(text);
    // A document from a newer schema version (another version of the portal wrote it) is read as far as
    // possible but never overwritten: changes last for this session only.
    newerOnDisk = storedSchemaVersion(text) > SCHEMA_VERSION;
    // An unreadable or invalid document is repaired and rewritten (ADR-0010); nothing is thrown at the user.
    if (text !== null && text !== JSON.stringify(doc)) write(doc);
    return doc;
  };

  const write = (doc: PersonalData): void => {
    if (!storage || newerOnDisk) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Storage went away or is full: keep going in memory for the rest of the session.
      storage = null;
      available.value = false;
    }
  };

  const data = signal<PersonalData>(parseDocument(null));
  data.value = read();
  const favorites = computed(() => data.value.favorites);

  const store: PersonalDataStore = {
    data,
    preferences: computed(() => data.value.preferences),
    storageAvailable: available,
    favorites,
    visibleFavorites: (visibleIds) => {
      const visible = new Set(visibleIds);
      return computed(() => visibleFavorites(favorites.value, visible));
    },
    isFavorite: (toolId) => isFavorite(data.value, toolId),
    pin(toolId, visibleIds) {
      const { result, doc } = pinFavorite(data.peek(), toolId, visibleIds, new Date().toISOString());
      if (doc !== data.peek()) store.update(() => doc);
      return result;
    },
    unpin(toolId) {
      if (isFavorite(data.peek(), toolId)) store.update((doc) => unpinFavorite(doc, toolId));
    },
    update(recipe) {
      const next = normalizeDocument(recipe(structuredClone(data.peek())));
      batch(() => {
        data.value = next;
        write(next);
      });
    },
    setTheme(theme) {
      store.update((doc) => ({ ...doc, preferences: { ...doc.preferences, theme } }));
    },
    snapshot: () => structuredClone(data.peek()),
    refresh() {
      const next = read();
      if (JSON.stringify(next) !== JSON.stringify(data.peek())) data.value = next;
    },
    dispose() {
      env.events?.removeEventListener('storage', onStorage);
      env.events?.removeEventListener('focus', onFocus);
    },
  };

  // Last write wins across windows (F-005 edge case).
  const onStorage = (e: Event) => {
    const key = (e as StorageEvent).key;
    if (key === STORAGE_KEY || key === null) store.refresh();
  };
  const onFocus = () => store.refresh();
  env.events?.addEventListener('storage', onStorage);
  env.events?.addEventListener('focus', onFocus);

  return store;
}

let shared: PersonalDataStore | undefined;

/** The page's single store, shared by every island (browser only). */
export function personalData(): PersonalDataStore {
  shared ??= createPersonalDataStore({ storage: () => window.localStorage, events: window });
  return shared;
}
