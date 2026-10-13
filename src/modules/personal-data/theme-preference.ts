// MOD-PersonalData (scaffold slice): only the stored theme preference, so the shell's theme toggle works.
// The full store (signals, RULE-01/02/13, cross-window sync, in-memory fallback) arrives with F-005/F-006.
// Storage shape: one JSON document under `tarokit.personal`, shaped like `personalData` (ADR-0010).
import type { PersonalData } from '../../generated/domain.ts';

export const STORAGE_KEY = 'tarokit.personal';
export type ThemePreference = 'system' | 'light' | 'dark';

const emptyDocument = (): PersonalData => ({
  schemaVersion: 1,
  favorites: [],
  recents: [],
  preferences: { theme: 'system' },
  daysUsed: [],
});

function readDocument(): PersonalData | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const doc: unknown = raw ? JSON.parse(raw) : undefined;
    return doc && typeof doc === 'object' ? (doc as PersonalData) : undefined;
  } catch {
    return undefined;
  }
}

export function readStoredTheme(): ThemePreference {
  const theme = readDocument()?.preferences?.theme;
  return theme === 'light' || theme === 'dark' ? theme : 'system';
}

/** Writes through the whole document, keeping every other field (ADR-0010). Session-only if storage fails. */
export function setTheme(theme: ThemePreference): void {
  const doc = readDocument() ?? emptyDocument();
  doc.preferences = { ...doc.preferences, theme };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Storage unavailable (F-012 edge case): the choice lasts for this page only.
  }
}
