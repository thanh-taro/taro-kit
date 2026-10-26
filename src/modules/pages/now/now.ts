// MOD-Pages: SCR-Now data, built at build time from the registry (F-010). Pure. The changelog comes from
// MOD-Content's `changelog()` (RULE-04); nothing here depends on the viewer's date (the stale label is the
// StaleLabel island's job, RULE-09). Dates are absolute calendar dates, so they are formatted once at build.
// Implements: F-010.R1 (note and date), F-010.R3 (changelog), F-010.R4 (states).
import type { NowNote } from '../../../generated/domain.ts';
import { changelog, toolPath, type Dated, type DatedItem } from '../../content/derive.ts';
import { formatDate, formatMonth, tBoth, type CopyId } from '../../copy/index.ts';
import { LANGUAGES, type Lang, type Loc, type Text } from '../../language/languages.ts';

/**
 * A calendar date as shown (`Oct 13, 2026` / `13 thg 10, 2026`, or without the year), read in full
 * (`October 13, 2026` / `13 tháng 10, 2026`) and machine-readable; in both languages (F-019.R4, RULE-16).
 */
export interface DateText {
  iso: string;
  shown: Loc;
  full: Loc;
}
/** A copy string split around its one placeholder, so the placeholder's value can carry its own markup. */
export interface Around {
  before: string;
  after: string;
}
/** `Around` for each language. */
export type LocAround = Record<Lang, Around>;
export interface ChangelogEntry {
  id: string;
  type: DatedItem['type'];
  href: string;
  tool: string;
  /** COPY-now.changelogAdded or COPY-now.changelogUpdated around {tool}. */
  label: LocAround;
  date: DateText;
}
export interface ChangelogGroup {
  /** YYYY-MM. */
  month: string;
  /** `October 2026` / `Tháng 10 năm 2026`. */
  label: Loc;
  items: ChangelogEntry[];
}
export interface NowViewData {
  note?: {
    paragraphs: Record<Lang, string[]>;
    updated: DateText;
    /** COPY-now.updated around {date}. */
    updatedLabel: LocAround;
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

/** `around` for both versions of a localized text. */
export const aroundBoth = (text: Loc): LocAround =>
  Object.fromEntries(LANGUAGES.map((l) => [l, around(text[l])])) as LocAround;

/** A COPY string with one placeholder, split around it in both languages. */
export const copyAround = (id: CopyId, slot: string): LocAround =>
  aroundBoth(tBoth(id as 'COPY-now.updated', { [slot]: SLOT } as { date: string }));

const perLanguage = (fn: (lang: Lang) => string): Loc => ({ 'en-US': fn('en-US'), 'vi-VN': fn('vi-VN') });

/** `withYear`: the note's date; without, a changelog item's date inside its month group. */
export const dateText = (iso: string, withYear = true): DateText => ({
  iso,
  shown: perLanguage((l) => formatDate(iso, l, withYear ? 'short' : 'day')),
  full: perLanguage((l) => formatDate(iso, l, 'full')),
});
/** `2026-10` → `October 2026` / `Tháng 10 năm 2026` (a group title starts with a capital). */
export const monthLabel = (month: string): Loc => perLanguage((l) => formatMonth(month, l, true));
/** Paragraphs are separated by blank lines (ADR-0005). */
export const paragraphs = (body: string): string[] =>
  body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
/** `paragraphs` of each version. */
export const paragraphsBoth = (body: Text): Record<Lang, string[]> =>
  Object.fromEntries(LANGUAGES.map((l) => [l, paragraphs(typeof body === 'string' ? body : body[l])])) as Record<
    Lang,
    string[]
  >;

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
      label: copyAround(i.type === 'added' ? 'COPY-now.changelogAdded' : 'COPY-now.changelogUpdated', 'tool'),
      date: dateText(i.date, false),
    })),
  }));
  return {
    note: now && {
      paragraphs: paragraphsBoth(now.body),
      updated: dateText(now.updated),
      updatedLabel: copyAround('COPY-now.updated', 'date'),
    },
    months,
    empty: !now && months.length === 0,
  };
}
