// MOD-PersonalData: the stored document (ADR-0010). One JSON document under `tarokit.personal`, shaped
// exactly like `personalData` in the domain schema, schema version 2 (RULE-08; version 1 had no language, F-019).
// Pure functions only: no storage access here, so the rules stay trivially unit-testable.
import type { PersonalData } from '../../generated/domain.ts';
import { isCalendarDate, isTimestamp, isToolId } from './entry-checks.ts';

export { isCalendarDate, isTimestamp, isToolId };

export type { PersonalData };
export type ThemePreference = NonNullable<PersonalData['preferences']['theme']>;
/** A stored language choice (F-019, RULE-16); absent means the language follows the device. */
export type LanguageChoice = NonNullable<PersonalData['preferences']['language']>;

export const STORAGE_KEY = 'tarokit.personal';
/** The schema version (RULE-08): 2 since F-019 added the language; version 1 (M-1 up to v1.2) had none. */
export const SCHEMA_VERSION = 2;

/** Limits from the domain schema: RULE-02 (24 favorites), RULE-01 (20 recents), RULE-13 (60 dates). */
const LIMITS = { favorites: 24, recents: 20, daysUsed: 60 } as const;

/** RULE-08 defaults: empty favorites, recents and days used; theme system; no language (it follows the device). */
export const emptyDocument = (): PersonalData => ({
  schemaVersion: SCHEMA_VERSION,
  favorites: [],
  recents: [],
  preferences: { theme: 'system' },
  daysUsed: [],
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Entry checks (tool id, calendar date, timestamp) live in entry-checks.ts, shared with home's inline prediction.
export const isThemePreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';
export const isLanguageChoice = (v: unknown): v is LanguageChoice => v === 'en-US' || v === 'vi-VN';

/** Keeps well-formed items with a unique key, in order, up to the limit. */
function keepValid<T>(
  raw: unknown,
  limit: number,
  pick: (item: unknown) => T | undefined,
  key: (item: T) => string,
): T[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of raw) {
    const picked = pick(item);
    if (picked === undefined || seen.has(key(picked))) continue;
    seen.add(key(picked));
    out.push(picked);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Reads whatever was stored into a valid document (ADR-0010): an unreadable or invalid document is
 * treated like a damaged backup, so its valid parts are kept and the rest filled with RULE-08 defaults.
 * Entries are validated one by one and invalid ones dropped: tool ids must be catalog ids, times ISO
 * timestamps, and days used real calendar dates.
 * Never throws.
 */
export function normalizeDocument(raw: unknown): PersonalData {
  if (!isRecord(raw)) return emptyDocument();
  const prefs = isRecord(raw.preferences) ? raw.preferences : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    favorites: keepValid(
      raw.favorites,
      LIMITS.favorites,
      (f) =>
        isRecord(f) && isToolId(f.toolId) && isTimestamp(f.pinnedAt)
          ? { toolId: f.toolId, pinnedAt: f.pinnedAt }
          : undefined,
      (f) => f.toolId,
    ),
    recents: keepValid(
      raw.recents,
      LIMITS.recents,
      (r) =>
        isRecord(r) && isToolId(r.toolId) && isTimestamp(r.openedAt)
          ? { toolId: r.toolId, openedAt: r.openedAt }
          : undefined,
      (r) => r.toolId,
    ),
    preferences: {
      theme: isThemePreference(prefs.theme) ? prefs.theme : 'system',
      ...(isLanguageChoice(prefs.language) ? { language: prefs.language } : {}),
    },
    daysUsed: keepValid(
      raw.daysUsed,
      LIMITS.daysUsed,
      (d) => (isCalendarDate(d) ? d : undefined),
      (d) => d,
    ),
  };
}

/** Parses the stored text; `null` (nothing stored) and unparsable text both yield the defaults. */
export function parseDocument(text: string | null): PersonalData {
  if (text === null) return emptyDocument();
  try {
    return normalizeDocument(JSON.parse(text));
  } catch {
    return emptyDocument();
  }
}

/** The schemaVersion in the stored text, or 0 when there is none or it can't be read. */
export function storedSchemaVersion(text: string | null): number {
  try {
    const v: unknown = text === null ? undefined : (JSON.parse(text) as { schemaVersion?: unknown })?.schemaVersion;
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}
