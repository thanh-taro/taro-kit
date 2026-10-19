// MOD-PersonalData public surface (ADR-0010). F-005, F-006 and F-013 build their commands on `update`.
// Favorites (F-005): `store.favorites`, `store.visibleFavorites(ids)`, `store.isFavorite(id)`, `store.pin(id, ids)`,
// `store.unpin(id)`; the pure RULE-02 / INV-04 functions are exported for tests and other rule callers.
// Recents and days used (F-006): `store.recents`, `store.visibleRecents(ids, { excludeFavorites, max })`,
// `store.daysUsedLast14`, `store.recordVisit(id)`, `store.recordDay()`, `store.clearRecents()`; pure RULE-01 /
// RULE-13 functions alongside.
// Backup (F-013): `store.replaceAll(data)` and `store.eraseAll()`, after the caller confirms.
export {
  emptyDocument,
  isCalendarDate,
  isThemePreference,
  isTimestamp,
  isToolId,
  normalizeDocument,
  parseDocument,
  SCHEMA_VERSION,
  STORAGE_KEY,
  storedSchemaVersion,
  type PersonalData,
  type ThemePreference,
} from './document.ts';
export {
  FAVORITES_LIMIT,
  isFavorite,
  pinFavorite,
  unpinFavorite,
  visibleFavorites,
  type Favorite,
  type PinResult,
  type VisibleIds,
} from './favorites.ts';
export {
  clearRecentVisits,
  RECENTS_LIMIT,
  RECENTS_SHOWN,
  recordRecentVisit,
  visibleRecents,
  type RecentVisit,
  type VisibleRecentsOptions,
} from './recents.ts';
export {
  DAYS_USED_FUTURE_TOLERANCE,
  DAYS_USED_LIMIT,
  DAYS_USED_WINDOW,
  daysUsedInLast14,
  daysUsedWindow,
  recordDayUsed,
} from './days-used.ts';
export { daysBetween, localDate } from './dates.ts';
export {
  createPersonalDataStore,
  personalData,
  type SaveResult,
  type PersonalDataStore,
  type StoreEnvironment,
} from './store.ts';
export { readStoredTheme } from './read-stored-theme.ts';
