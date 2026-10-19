// MOD-PersonalData: the checks a stored entry must pass (ADR-0010), shared by `normalizeDocument` (document.ts) and
// home's before-first-paint prediction (MOD-Pages home/inline.ts), which inlines these functions' source with
// `.toString()`. So each one must stay self-contained: no imports, no outer variables, no line comments inside.

/** A catalog id: the domain schema's `slug` (pattern and 48-character cap, INV-01). */
export const isToolId = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 48 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);

/** A real calendar date as YYYY-MM-DD (no 2026-02-30). */
export function isCalendarDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * An ISO 8601 date-time with a zone (the schema's `timestamp`) on a real calendar date. Its calendar check is
 * `isCalendarDate`'s, repeated so the function stays self-contained (a unit test keeps the two in step).
 */
export function isTimestamp(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.exec(v);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return false;
  return !Number.isNaN(Date.parse(v));
}
