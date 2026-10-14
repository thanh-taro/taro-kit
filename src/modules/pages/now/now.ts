// MOD-Pages: SCR-Now data, built at build time from the registry (F-010). Pure. The changelog comes from
// MOD-Content's `changelog()` (RULE-04); nothing here depends on the viewer's date (the stale label is the
// StaleLabel island's job, RULE-09). Dates are absolute calendar dates, so they are formatted once at build.
// Implements: F-010.R1 (note and date), F-010.R3 (changelog), F-010.R4 (states).
import type { NowNote } from '../../../generated/domain.ts';
import { changelog, toolPath, type Dated, type DatedItem } from '../../content/derive.ts';
import { t } from '../../copy/index.ts';

/** A calendar date as shown (`Oct 13, 2026` or `Oct 13`), read in full (`October 13, 2026`) and machine-readable. */
export interface DateText {
  iso: string;
  shown: string;
  full: string;
}
/** A copy string split around its one placeholder, so the placeholder's value can carry its own markup. */
export interface Around {
  before: string;
  after: string;
}
export interface ChangelogEntry {
  id: string;
  type: DatedItem['type'];
  href: string;
  tool: string;
  /** COPY-now.changelogAdded or COPY-now.changelogUpdated around {tool}. */
  label: Around;
  date: DateText;
}
export interface ChangelogGroup {
  /** YYYY-MM. */
  month: string;
  /** `October 2026`. */
  label: string;
  items: ChangelogEntry[];
}
export interface NowViewData {
  note?: {
    paragraphs: string[];
    updated: DateText;
    /** COPY-now.updated around {date}. */
    updatedLabel: Around;
  };
  months: ChangelogGroup[];
  /** No note and no visible tools: CMP-StateMessage with COPY-now.empty (F-010.R4). */
  empty: boolean;
}

const SLOT = '\u0000';
/** Splits a copy string formatted with SLOT as its placeholder value; a copy string without it is a spec error. */
export const around = (text: string): Around => {
  const i = text.indexOf(SLOT);
  if (i < 0) throw new Error(`SCR-Now copy "${text}" is missing its placeholder ({tool} or {date})`);
  return { before: text.slice(0, i), after: text.slice(i + SLOT.length) };
};

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' });
const SHORT = fmt({ month: 'short', day: 'numeric', year: 'numeric' });
const DAY = fmt({ month: 'short', day: 'numeric' });
const FULL = fmt({ month: 'long', day: 'numeric', year: 'numeric' });
const MONTH = fmt({ month: 'long', year: 'numeric' });
const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** `withYear`: the note's date; without, a changelog item's date inside its month group. */
export const dateText = (iso: string, withYear = true): DateText => ({
  iso,
  shown: (withYear ? SHORT : DAY).format(utc(iso)),
  full: FULL.format(utc(iso)),
});
/** `2026-10` → `October 2026`. */
export const monthLabel = (month: string): string => MONTH.format(utc(`${month}-01`));
/** Paragraphs are separated by blank lines (ADR-0005). */
export const paragraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function nowView(content: { now?: NowNote; tools: readonly Dated[] }): NowViewData {
  const { now } = content;
  const months = changelog(content.tools).map((m) => ({
    month: m.month,
    label: monthLabel(m.month),
    items: m.items.map((i) => ({
      id: i.id,
      type: i.type,
      href: toolPath(i.id),
      tool: i.name,
      label: around(t(i.type === 'added' ? 'COPY-now.changelogAdded' : 'COPY-now.changelogUpdated', { tool: SLOT })),
      date: dateText(i.date, false),
    })),
  }));
  return {
    note: now && {
      paragraphs: paragraphs(now.body),
      updated: dateText(now.updated),
      updatedLabel: around(t('COPY-now.updated', { date: SLOT })),
    },
    months,
    empty: !now && months.length === 0,
  };
}
