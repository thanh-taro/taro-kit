// MOD-PersonalData: local calendar dates (platform-mapping "Local date, YYYY-MM-DD"). Pure and import-free.
// Used by days used (RULE-13), what's new (RULE-04, MOD-Pages) and the backup file name (F-013.R1).

/** The local calendar date of `d` as YYYY-MM-DD. Never from toISOString, which is UTC. */
export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from `from` to `to`, both YYYY-MM-DD calendar dates. */
export function daysBetween(from: string, to: string): number {
  const utc = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}
