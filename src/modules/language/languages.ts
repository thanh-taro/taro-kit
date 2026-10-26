// MOD-Language: the two languages (RULE-16) and localized text, shared by build code and islands. Pure, no imports.
// A localized text is `{ 'en-US', 'vi-VN' }` (INV-09, ADR-0012); a name may be one string for both languages.
// Implements: RULE-16 (the language codes), INV-09 (the shape of localized text).

/** RULE-16: the portal's languages, en-US first (the no-script default, F-019.R8). */
export const LANGUAGES = ['en-US', 'vi-VN'] as const;
export type Lang = (typeof LANGUAGES)[number];
/** The language of the built HTML, link previews and the site index (F-019.R8). */
export const DEFAULT_LANGUAGE: Lang = 'en-US';

/** Localized text: one version per language (INV-09). */
export type Loc = Record<Lang, string>;
/** A text that is either the same in both languages (a name) or localized. */
export type Text = string | Loc;

export const isLang = (v: unknown): v is Lang => v === 'en-US' || v === 'vi-VN';
export const otherLanguage = (lang: Lang): Lang => (lang === 'en-US' ? 'vi-VN' : 'en-US');

/** The version of `text` in `lang`. */
export const pick = (text: Text, lang: Lang): string => (typeof text === 'string' ? text : text[lang]);

/** Both versions of `text`. */
export const both = (text: Text): Loc => (typeof text === 'string' ? { 'en-US': text, 'vi-VN': text } : text);

/** The one text both languages share, or undefined when the versions differ (ADR-0012: rendered once, no `lang`). */
export const shared = (text: Text): string | undefined =>
  typeof text === 'string' ? text : text['en-US'] === text['vi-VN'] ? text['en-US'] : undefined;

/** `fn` applied to each version. */
export const mapText = (text: Text, fn: (value: string, lang: Lang) => string): Loc => ({
  'en-US': fn(pick(text, 'en-US'), 'en-US'),
  'vi-VN': fn(pick(text, 'vi-VN'), 'vi-VN'),
});

/** Every distinct version of `text` (for search keys and font checks). */
export const versions = (text: Text): string[] => [...new Set(LANGUAGES.map((l) => pick(text, l)))];
