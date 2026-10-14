// MOD-Pages: the RULE-09 stale check for the Now note, against the viewer's local date in the browser, never the
// build date (MOD-Content is not responsible for anything relative to the viewer's date). Browser-safe.
// Reuses RULE-04's calendar-date helpers (whats-new.ts).
// Implements: F-010.R2.
import { daysBetween, localDate } from '../whats-new.ts';

/** RULE-09: a Now note more than this many days old is labeled possibly out of date. */
export const STALE_DAYS = 90;

/** True when `updated` (YYYY-MM-DD) is more than 90 days before `today` (YYYY-MM-DD). */
export const isStale = (updated: string, today: string): boolean => daysBetween(updated, today) > STALE_DAYS;

/** RULE-09 on the viewer's local calendar date now. */
export const staleToday = (updated: string, now: Date = new Date()): boolean => isStale(updated, localDate(now));
