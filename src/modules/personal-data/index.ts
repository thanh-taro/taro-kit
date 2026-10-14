// MOD-PersonalData public surface (ADR-0010). F-005, F-006 and F-013 build their commands on `update`.
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
export { createPersonalDataStore, personalData, type PersonalDataStore, type StoreEnvironment } from './store.ts';
export { readStoredTheme } from './read-stored-theme.ts';
