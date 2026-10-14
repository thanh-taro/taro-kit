// MOD-PersonalData: days used as pure functions over the stored document (ADR-0010).
// Implements: RULE-13 (each distinct local date the portal was opened, the latest 60 kept; "days used in the
// last 14 days" counts the recorded dates within the last 14 days, today included), F-006.R6.
// Edge case (F-006): when the device clock moves backward, the date is recorded as it is, never twice.
import { daysBetween } from './dates.ts';
import type { PersonalData } from './document.ts';

/** RULE-13: the latest 60 dates are kept. */
export const DAYS_USED_LIMIT = 60;
/** RULE-13: the window counted on settings, today included. */
export const DAYS_USED_WINDOW = 14;

/**
 * RULE-13 record `today` (a local YYYY-MM-DD date). Dates are kept newest first, so the latest 60 stay.
 * Returns the same document when the date is already recorded (nothing to write).
 */
export function recordDayUsed(doc: PersonalData, today: string): PersonalData {
  if (doc.daysUsed.includes(today)) return doc;
  const daysUsed = [...doc.daysUsed, today].sort((a, b) => b.localeCompare(a)).slice(0, DAYS_USED_LIMIT);
  return { ...doc, daysUsed };
}

/** True when `date` is within the last 14 days of `today`, today included; future dates are not. */
const inWindow = (date: string, today: string): boolean => {
  const age = daysBetween(date, today);
  return age >= 0 && age < DAYS_USED_WINDOW;
};

/** RULE-13: the recorded dates within the last 14 days, today included. */
export function daysUsedInLast14(daysUsed: readonly string[], today: string): number {
  return new Set(daysUsed.filter((d) => inWindow(d, today))).size;
}

/** The last 14 days, oldest first and today last: true where the portal was used (the settings strip). */
export function daysUsedWindow(daysUsed: readonly string[], today: string): boolean[] {
  const ages = new Set(daysUsed.filter((d) => inWindow(d, today)).map((d) => daysBetween(d, today)));
  return Array.from({ length: DAYS_USED_WINDOW }, (_, i) => ages.has(DAYS_USED_WINDOW - 1 - i));
}
