// MOD-Search normalization: matching ignores case and diacritics (RULE-05). Pure and browser-safe.
// Lower-case, map đ to d (it does not decompose), NFD, strip combining marks, then trim and collapse whitespace.
// Implements: RULE-05 (case and diacritics).

const COMBINING_MARKS = /\p{M}/gu;

/** The search form of a text: "  Đồng Hồ  " → "dong ho". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, ' ')
    .trim();
}
