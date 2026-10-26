// MOD-Copy: every user-facing string comes from here (specs/30-experience/copy.md), in en-US and vi-VN (F-019).
// A missing or misspelled COPY id, or a missing {placeholder}, is a type error.
// - `t(id, params?, lang?)`: one version; `lang` defaults to the language showing (the root element's `lang` in the
//   browser, en-US at build, the no-script default, F-019.R8).
// - `tBoth(id, params?)`: both versions, for build-time text rendered through <L> (ADR-0012).
// - `formatDate`, `formatTime`, `formatMonth`: dates in the conventions of a language (RULE-16, Intl).
import { COPY, type CopyId, type CopyParams } from '../../generated/copy.ts';
import { DEFAULT_LANGUAGE, isLang, LANGUAGES, type Lang, type Loc } from '../language/languages.ts';

export type { CopyId, CopyParams };

type Params<I extends CopyId> = I extends keyof CopyParams ? CopyParams[I] : undefined;
type Args<I extends CopyId> = I extends keyof CopyParams
  ? [params: CopyParams[I], lang?: Lang]
  : [params?: undefined, lang?: Lang];

/** The language showing: the root element's `lang` in a browser, en-US at build. */
export function showingLanguage(): Lang {
  const lang = typeof document === 'undefined' ? undefined : document.documentElement.getAttribute('lang');
  return isLang(lang) ? lang : DEFAULT_LANGUAGE;
}

function fill(id: string, text: string, params: Record<string, string | number> | undefined): string {
  return text.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, name: string) => {
    const v = params?.[name];
    if (v === undefined) throw new Error(`${id}: missing value for {${name}}`);
    return String(v);
  });
}

export function t<I extends CopyId>(id: I, ...args: Args<I>): string {
  const [params, lang = showingLanguage()] = args as [Record<string, string | number> | undefined, Lang?];
  return fill(id, COPY[id][lang], params);
}

/** Both versions of a COPY string; `params` may differ per language (a function of the language). */
export function tBoth<I extends CopyId>(id: I, params?: Params<I> | ((lang: Lang) => Params<I>)): Loc {
  const out = {} as Loc;
  for (const lang of LANGUAGES) {
    const p = typeof params === 'function' ? params(lang) : params;
    out[lang] = fill(id, COPY[id][lang], p as Record<string, string | number> | undefined);
  }
  return out;
}

const utc = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T00:00:00Z`);
const fmt = (lang: Lang, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(lang, { ...options, timeZone: 'UTC' });

/**
 * A calendar date (YYYY-MM-DD) in a language (RULE-16): `full` "October 22, 2026" / "22 tháng 10, 2026",
 * `short` "Oct 22, 2026" / "22 thg 10, 2026", `day` (no year) "Oct 22" / "22 thg 10".
 */
export function formatDate(iso: string, lang: Lang, style: 'full' | 'short' | 'day' = 'full'): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'full'
      ? { month: 'long', day: 'numeric', year: 'numeric' }
      : style === 'short'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric' };
  return fmt(lang, options).format(utc(iso));
}

/**
 * A month (YYYY-MM) as the full month name and year in a language (RULE-15, RULE-16): "June 2022",
 * "tháng 6 năm 2022"; `capital` starts it with a capital letter, as the changelog's month groups do ("Tháng 6 năm 2022").
 */
export function formatMonth(month: string, lang: Lang, capital = false): string {
  const text = fmt(lang, { month: 'long', year: 'numeric' }).format(utc(month));
  return capital ? text.charAt(0).toLocaleUpperCase(lang) + text.slice(1) : text;
}

/** A local time of day in a language (F-007.R1): "8:00 AM", "8:00". */
export function formatTime(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(date);
}
