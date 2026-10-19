// MOD-Backup import (RULE-08): a picked backup file is validated whole before anything changes.
// - Read with the File API only (`size`, then `text()`), after a size cap, so an oversized file is never read.
// - `JSON.parse` in a try/catch; nothing is evaluated. Only known fields are copied out of the parsed value, so
//   `__proto__`/`constructor` keys in the file can't reach any prototype.
// - Validation reuses MOD-PersonalData's document rules (`normalizeDocument`: catalog ids, ISO timestamps on real
//   dates, real calendar dates, RULE-01/02/13 limits, one entry per tool): a file is valid only when normalizing
//   it changes nothing. There is no second validator.
// - Older or partial files are migrated with defaults first (empty lists, theme system), then validated.
// The result is returned to the caller, which confirms before `replaceAll` (F-013.R4). Nothing is uploaded.
// Implements: F-013.R2, F-013.R3 (RULE-08).
import {
  DAYS_USED_LIMIT,
  FAVORITES_LIMIT,
  isTimestamp,
  normalizeDocument,
  RECENTS_LIMIT,
  SCHEMA_VERSION,
  type PersonalData,
} from '../personal-data/index.ts';
import { BACKUP_FORMAT } from './export.ts';

/** Why a file was rejected; each has its COPY-import string (F-013.R2). */
export type ImportReason = 'notBackup' | 'damaged' | 'newerVersion' | 'tooLarge';
/** Every import failure: an invalid file's reason, or `unreadable` when the file couldn't be read at all. */
export type ImportFailure = ImportReason | 'unreadable';
export type ImportResult = { ok: true; data: PersonalData } | { ok: false; reason: ImportFailure };

/**
 * Larger than any backup can be: a full one (24 favorites, 20 recents, 60 dates, pretty-printed) is under 10 KB.
 * A bigger file is rejected as not a backup without being read (F-013 edge case).
 */
export const MAX_BACKUP_BYTES = 256 * 1024;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (reason: ImportFailure): ImportResult => ({ ok: false, reason });

/**
 * RULE-08 migration: the file's personal data with what is missing filled in with defaults (empty favorites,
 * recents and days used; theme system) and the current schema version. Present parts are kept as they are, so
 * validation still sees anything wrong with them. Only known fields are copied.
 */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const prefs = raw.preferences;
  return {
    schemaVersion: SCHEMA_VERSION,
    favorites: raw.favorites === undefined ? [] : raw.favorites,
    recents: raw.recents === undefined ? [] : raw.recents,
    preferences:
      prefs === undefined
        ? { theme: 'system' }
        : isRecord(prefs) && prefs.theme === undefined
          ? { ...prefs, theme: 'system' }
          : prefs,
    daysUsed: raw.daysUsed === undefined ? [] : raw.daysUsed,
  };
}

/** Deep equality of JSON values, ignoring key order. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => same(v, b[i]));
  }
  if (!isRecord(a) || !isRecord(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && same(a[k], b[k]));
}

const longerThan = (v: unknown, limit: number) => Array.isArray(v) && v.length > limit;

/** RULE-08 on an already-parsed value. */
export function validateBackup(raw: unknown): ImportResult {
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT) return fail('notBackup');
  const data = raw.data;
  if (!isRecord(data)) return fail('damaged');
  const version = data.schemaVersion;
  // No version means a file from before version 1: migrate it (F-013.R3).
  if (version !== undefined && (typeof version !== 'number' || !Number.isInteger(version) || version < 1)) {
    return fail('damaged');
  }
  if (typeof version === 'number' && version > SCHEMA_VERSION) return fail('newerVersion');
  if (!isTimestamp(raw.exportedAt)) return fail('damaged');

  const candidate = migrate(data);
  // RULE-01 / RULE-02 limits have their own reason; more than 60 dates is damaged (F-013 edge case).
  if (longerThan(candidate.favorites, FAVORITES_LIMIT) || longerThan(candidate.recents, RECENTS_LIMIT)) {
    return fail('tooLarge');
  }
  if (longerThan(candidate.daysUsed, DAYS_USED_LIMIT)) return fail('damaged');
  // Normalizing drops anything invalid: duplicates, bad ids, times or dates, unknown fields, wrong types.
  // If it changed anything, the file is damaged; otherwise its normalized copy holds only known fields.
  const normalized = normalizeDocument(candidate);
  // Recents keep the file's list order (RULE-01's newest first is the list's order); their times may be out of order
  // after the clock moved backward (F-006), and the portal always accepts its own exports.
  return same(normalized, candidate) ? { ok: true, data: normalized } : fail('damaged');
}

/** RULE-08 on the file's text. */
export function parseBackupText(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('damaged');
  }
  return validateBackup(raw);
}

/** Reads a picked file (File API only) and validates it whole (F-013.R2). Never throws. */
export async function parseBackup(file: Pick<Blob, 'size' | 'text'>): Promise<ImportResult> {
  if (file.size > MAX_BACKUP_BYTES) return fail('notBackup');
  let text: string;
  try {
    text = await file.text();
  } catch {
    // The browser couldn't read it (moved, permissions): nothing about the file is known (COPY-settings.importFailed).
    return fail('unreadable');
  }
  return parseBackupText(text);
}
