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
  emptyDocument,
  normalizeDocument,
  parseDocument,
  SCHEMA_VERSION,
  STORAGE_KEY,
  storedSchemaVersion,
  type PersonalData,
  type ThemePreference,
} from './document.ts';
import { localDate } from './dates.ts';
import { daysUsedInLast14, recordDayUsed } from './days-used.ts';
import {
  clearRecentVisits,
  recordRecentVisit,
  visibleRecents,
  type RecentVisit,
  type VisibleRecentsOptions,
} from './recents.ts';

const PROBE_KEY = 'tarokit.probe';

/** The parts of the browser the store touches; injectable so tests can fake them. */
export interface StoreEnvironment {
  /** `localStorage`, or `null`/a throwing getter when the browser withholds it. */
  storage: () => Storage | null;
  /** Where `storage` and `focus` events arrive (the window); omitted means no cross-window sync. */
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  /** The clock for visit times and the local date (RULE-13); default `new Date()`. Tests fix it. */
  now?: () => Date;
}

/** `clearRecents`, `replaceAll` and `eraseAll` outcome: saved on the device, or for this session only. */
export type SaveResult = 'saved' | 'unsaved';

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
  /** Every stored recent visit, newest first, including unknown or hidden tools (RULE-01, INV-04). */
  readonly recents: ReadonlySignal<RecentVisit[]>;
  /**
   * The recents that may be shown (RULE-01, INV-04): visible tools only, favorites left out unless
   * `excludeFavorites` is false, at most `max` (default 8). Reactive on visits, clears, pins and unpins.
   */
  visibleRecents(visibleIds: VisibleIds, options?: VisibleRecentsOptions): ReadonlySignal<RecentVisit[]>;
  /**
   * Today's local date (YYYY-MM-DD) from the store's clock. It moves on `recordDay()` and `refresh()`, so a page
   * left open past midnight catches up when it is shown or focused again (MOD-Shell calls `recordDay`).
   */
  readonly today: ReadonlySignal<string>;
  /** RULE-13: the recorded dates within the last 14 days of `today`, today included. */
  readonly daysUsedLast14: ReadonlySignal<number>;
  /** F-006.R1/R2: the tool moves to the top of recents with the current time (callers decide when). */
  recordVisit(toolId: string): void;
  /** F-006.R6: records today's local date once (RULE-13). Writes nothing when it is already recorded. */
  recordDay(): void;
  /**
   * F-006.R4: empties recents (the caller confirms first). `unsaved` when the change could not be kept on the
   * device (storage unavailable or failing, or a newer schema version on disk, which is never overwritten):
   * recents are then cleared for this session only, and the caller must say so.
   */
  clearRecents(): SaveResult;
  /**
   * Write-through mutation of the whole document (ADR-0010). The recipe must return a new document.
   * Returns true when the document was saved on the device, false when it lasts for this session only.
   */
  update(recipe: (current: PersonalData) => PersonalData): boolean;
  setTheme(theme: ThemePreference): void;
  /**
   * F-013.R4: replaces all personal data with a validated backup's (the caller confirms first). The user asked for
   * exactly this, so it also replaces a newer version's document on disk. `unsaved` when the device refuses the
   * write: the data is replaced for this session only, and the caller must say so.
   */
  replaceAll(data: PersonalData): SaveResult;
  /**
   * F-013.R5: erases all personal data (the caller confirms first): empty lists, theme system. As `replaceAll`, but
   * when writing the empty document fails, the stored document is removed instead, so the data is really gone.
   */
  eraseAll(): SaveResult;
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
  const now = env.now ?? (() => new Date());

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

  /**
   * True when the document is now on the device. A newer version's document is overwritten only with `replace`,
   * the user's explicit import or erase (F-013 edge case).
   */
  const write = (doc: PersonalData, replace = false): boolean => {
    if (!storage || (newerOnDisk && !replace)) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(doc));
      newerOnDisk = false;
      return true;
    } catch {
      // Storage went away or is full: keep going in memory for the rest of the session.
      storage = null;
      available.value = false;
      return false;
    }
  };

  const data = signal<PersonalData>(parseDocument(null));
  data.value = read();
  const favorites = computed(() => data.value.favorites);
  const recents = computed(() => data.value.recents);
  const today = signal(localDate(now()));
  const tick = () => {
    today.value = localDate(now());
  };

  /** Write-through of a whole new document (ADR-0010); true when it is on the device. */
  const commit = (doc: PersonalData, replace = false): boolean => {
    const next = normalizeDocument(doc);
    let saved = false;
    batch(() => {
      data.value = next;
      saved = write(next, replace);
    });
    return saved;
  };

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
    recents,
    visibleRecents: (visibleIds, options) => {
      const visible = new Set(visibleIds);
      return computed(() => visibleRecents(data.value, visible, options));
    },
    today,
    daysUsedLast14: computed(() => daysUsedInLast14(data.value.daysUsed, today.value)),
    recordVisit(toolId) {
      store.update((doc) => recordRecentVisit(doc, toolId, now().toISOString()));
    },
    recordDay() {
      tick();
      const date = today.peek();
      if (!data.peek().daysUsed.includes(date)) store.update((doc) => recordDayUsed(doc, date));
    },
    clearRecents() {
      return store.update(clearRecentVisits) ? 'saved' : 'unsaved';
    },
    update(recipe) {
      return commit(recipe(structuredClone(data.peek())));
    },
    setTheme(theme) {
      store.update((doc) => ({ ...doc, preferences: { ...doc.preferences, theme } }));
    },
    replaceAll: (doc) => (commit(structuredClone(doc), true) ? 'saved' : 'unsaved'),
    eraseAll() {
      const device = storage;
      if (commit(emptyDocument(), true)) return 'saved';
      if (!device) return 'unsaved';
      // The write failed (e.g. storage full): removing the document still erases it, and frees the space.
      try {
        device.removeItem(STORAGE_KEY);
      } catch {
        return 'unsaved';
      }
      storage = device;
      available.value = true;
      newerOnDisk = false;
      return 'saved';
    },
    snapshot: () => structuredClone(data.peek()),
    refresh() {
      tick();
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
