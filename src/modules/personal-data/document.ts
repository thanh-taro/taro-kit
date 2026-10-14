// MOD-PersonalData: the stored document (ADR-0010). One JSON document under `tarokit.personal`, shaped
// exactly like `personalData` in the domain schema, schema version 1 (RULE-08).
// Pure functions only: no storage access here, so the rules stay trivially unit-testable.
import type { PersonalData } from '../../generated/domain.ts';

export type { PersonalData };
export type ThemePreference = NonNullable<PersonalData['preferences']['theme']>;

export const STORAGE_KEY = 'tarokit.personal';
/** The M-1 schema version (RULE-08). */
export const SCHEMA_VERSION = 1;

/** Limits from the domain schema: RULE-02 (24 favorites), RULE-01 (20 recents), RULE-13 (60 dates). */
const LIMITS = { favorites: 24, recents: 20, daysUsed: 60 } as const;

/** RULE-08 defaults: empty favorites, recents and days used; theme system. */
export const emptyDocument = (): PersonalData => ({
  schemaVersion: SCHEMA_VERSION,
  favorites: [],
  recents: [],
  preferences: { theme: 'system' },
  daysUsed: [],
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A catalog id: the domain schema's `slug` (pattern and 48-character cap, INV-01). */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const isToolId = (v: unknown): v is string => typeof v === 'string' && v.length <= 48 && SLUG.test(v);

/** A real calendar date as YYYY-MM-DD (no 2026-02-30). */
export function isCalendarDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** An ISO 8601 date-time with a zone (the schema's `timestamp`) on a real calendar date. */
const TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
export function isTimestamp(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = TIMESTAMP.exec(v);
  return !!m && isCalendarDate(m[1]) && !Number.isNaN(Date.parse(v));
}
export const isThemePreference = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';

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
    preferences: { theme: isThemePreference(prefs.theme) ? prefs.theme : 'system' },
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
