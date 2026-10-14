// MOD-PersonalData public surface (ADR-0010). F-005, F-006 and F-013 build their commands on `update`.
// Favorites (F-005): `store.favorites`, `store.visibleFavorites(ids)`, `store.isFavorite(id)`, `store.pin(id, ids)`,
// `store.unpin(id)`; the pure RULE-02 / INV-04 functions are exported for tests and other rule callers.
export {
  emptyDocument,
  isThemePreference,
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
export { createPersonalDataStore, personalData, type PersonalDataStore, type StoreEnvironment } from './store.ts';
export { readStoredTheme } from './read-stored-theme.ts';
