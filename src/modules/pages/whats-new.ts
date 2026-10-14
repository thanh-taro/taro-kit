// MOD-Pages: what's new on home, computed in the browser against the viewer's local date (RULE-04, F-007.R4).
// Pure and synchronous; the home island calls it with the catalog data and `localDate()`.
// Only types come from MOD-Content, which never runs in the browser.
// Implements: F-001.R1 (a new tool appears in what's new), F-001.R4 (hidden tools never do).
import type { Dated, DatedItem } from '../content/derive.ts';
import { daysBetween } from '../personal-data/dates.ts';

// The local-date helpers live in MOD-PersonalData (platform-mapping), shared with days used (RULE-13).
export { daysBetween, localDate } from '../personal-data/dates.ts';

/** RULE-04 window and cap. */
export const WHATS_NEW_DAYS = 30;
export const WHATS_NEW_MAX = 6;
/** One day of tolerance for a date just ahead of the viewer's, from a timezone gap with the build. */
const FUTURE_TOLERANCE_DAYS = 1;

/**
 * RULE-04 what's new on the viewer's local date `today` (YYYY-MM-DD), never the build date.
 * One item per visible tool, dated and labeled by its latest date (`updated` if present, otherwise `added`),
 * kept when that date is within the last 30 days counting today (or at most one day ahead),
 * newest first, at most 6.
 */
export function whatsNew(tools: readonly Dated[], today: string): DatedItem[] {
  return (
    tools
      .filter((t) => !t.hidden) // RULE-06
      .map((t): DatedItem => {
        const type = t.updated ? 'updated' : 'added';
        return { id: t.id, name: t.name, type, date: t.updated ?? t.added };
      })
      .filter((i) => {
        const age = daysBetween(i.date, today);
        return age >= -FUTURE_TOLERANCE_DAYS && age < WHATS_NEW_DAYS;
      })
      // Newest first; same-date ties by name (each tool has one item).
      .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, 'en'))
      .slice(0, WHATS_NEW_MAX)
  );
}
