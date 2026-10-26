// MOD-Content: the privacy policy and the terms of use (ENT-Policy) as the rest of the portal reads them. Pure, no
// Node imports. The body format is the ADR-0005 note from F-018: paragraphs separated by blank lines; a paragraph
// whose every line starts with "- " is a bulleted list, one item per line; inline links are `[text](address)` with
// an https or mailto address. Any other text, other bracket syntax included, is literal text. No Markdown engine.
// Implements: F-018.R1, F-018.R2 (sections parsed into blocks), F-018.R5 (INV-02 on policy links, mixed list
// paragraphs, sections named "section <n>").

import { LANGUAGES, type Lang, type Loc } from '../language/languages.ts';

/** The Privacy page's portal address (MOD-Pages, platform-mapping). */
export const PRIVACY_PATH = '/privacy/';
/** The Terms page's portal address (MOD-Pages, platform-mapping). */
export const TERMS_PATH = '/terms/';

/** A run of plain text, or a link with its visible text and address (ENT-Policy). */
export type PolicyPart =
  | { kind: 'text'; text: string }
  /** Web links open in a new tab; email links open the mail app (SCR-Policy). */
  | { kind: 'link'; text: string; href: string; newTab: boolean };
/** A paragraph, or a simple bulleted list whose items are runs of text and links (ENT-Policy). */
export type PolicyBlock = { kind: 'paragraph'; parts: PolicyPart[] } | { kind: 'list'; items: PolicyPart[][] };
export interface PolicySection {
  /** The heading in both languages (INV-09). */
  heading: Loc;
  /** The body's blocks in each language. */
  blocks: Record<Lang, PolicyBlock[]>;
}
/** A validated policy with each section's body parsed into blocks (MOD-Content `Registry.privacy`, `.terms`). */
export interface Policy {
  /** The title in both languages (INV-09). */
  title: Loc;
  /** The last updated date, YYYY-MM-DD. */
  updated: string;
  sections: PolicySection[];
}

/** F-018.R5: a section is named by its position, counting from 1 ("section 2"). */
export const policySectionName = (index: number): string => `section ${index + 1}`;

/**
 * Text that looks like an inline link: a bracketed label right before "(" and something other than ")". Every such
 * place must hold a well-formed `[text](address)` (LINK) with an https or mailto address, or the build fails (INV-02,
 * F-018 edge case). Other bracket text (`[note]`, `[x]()`) is literal.
 */
const LINK_LIKE = /\[[^[\]\n]+\]\((?!\))/g;
/** A well-formed inline link at a LINK_LIKE place: no brackets in the label, no spaces or parentheses in the address. */
const LINK = /\[([^[\]\n]+)\]\(([^()\s]+)\)/y;
const LIST_LINE = /^- /;

/** INV-02: a policy link is a secure web address (https) or an email link. */
const linkAllowed = (href: string): boolean =>
  (href.startsWith('https://') && URL.canParse(href)) || /^mailto:[^\s]+$/.test(href);

/** One link-like place in a run of text: a valid link, or why it is not one. */
type Found =
  | { at: number; end: number; ok: true; text: string; href: string }
  | { at: number; end: number; ok: false; kind: 'insecure' | 'malformed'; link: string };

function findLinks(text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(LINK_LIKE)) {
    LINK.lastIndex = m.index;
    const strict = LINK.exec(text);
    if (strict) {
      const [whole, label, href] = strict as unknown as [string, string, string];
      const end = m.index + whole.length;
      out.push(
        linkAllowed(href)
          ? { at: m.index, end, ok: true, text: label, href }
          : { at: m.index, end, ok: false, kind: 'insecure', link: href },
      );
    } else {
      // Unreadable: name it up to its first ")" (or the end of the text), as the author wrote it.
      const close = text.indexOf(')', m.index + m[0].length);
      const end = close < 0 ? text.length : close + 1;
      out.push({ at: m.index, end, ok: false, kind: 'malformed', link: text.slice(m.index, end) });
    }
  }
  return out;
}

/** A body's paragraph: lines between blank lines, with the index of its first line in the body. */
interface Paragraph {
  start: number;
  lines: string[];
  /** Every line starts with "- ": a bulleted list, one item per line. */
  list: boolean;
  /** Some, not all, lines start with "- " (an error, ADR-0005 note from F-018). */
  mixed: boolean;
}

function paragraphsOf(body: string): Paragraph[] {
  const out: { start: number; lines: string[] }[] = [];
  let current: { start: number; lines: string[] } | undefined;
  body.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line) {
      current = undefined;
      return;
    }
    if (!current) out.push((current = { start: i, lines: [] }));
    current.lines.push(line);
  });
  return out.map(({ start, lines }) => {
    const listLines = lines.filter((l) => LIST_LINE.test(l)).length;
    return { start, lines, list: listLines === lines.length, mixed: listLines > 0 && listLines < lines.length };
  });
}

/**
 * The runs of text a paragraph shows, each with the body line it starts on: a list's items, one per line, or the
 * paragraph's lines joined with a space. Both the page (policyBlocks) and the INV-02 check read these, so a link the
 * page would show is exactly a link the check sees.
 */
const runsOf = (p: Paragraph): { line: number; text: string }[] =>
  p.list
    ? p.lines.map((l, i) => ({ line: p.start + i, text: l.replace(LIST_LINE, '').trim() }))
    : [{ line: p.start, text: p.lines.join(' ') }];

function parts(text: string): PolicyPart[] {
  const out: PolicyPart[] = [];
  let at = 0;
  // A place that is not a valid link fails the build (policyLinkErrors), so it never reaches a page.
  for (const f of findLinks(text)) {
    if (!f.ok) continue;
    if (f.at > at) out.push({ kind: 'text', text: text.slice(at, f.at) });
    out.push({ kind: 'link', text: f.text, href: f.href, newTab: f.href.startsWith('https://') });
    at = f.end;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  return out;
}

/**
 * A section body as blocks (ENT-Policy): each paragraph, or each bulleted list (a paragraph whose every line starts
 * with "- "), with its text and links. Lines inside a paragraph join with a space (ADR-0005 note from F-018).
 */
export const policyBlocks = (body: string): PolicyBlock[] =>
  paragraphsOf(body).map((p): PolicyBlock => {
    const runs = runsOf(p).map((r) => parts(r.text));
    return p.list ? { kind: 'list', items: runs } : { kind: 'paragraph', parts: runs[0] ?? [] };
  });

/** Each section's index, language and paragraphs, for each version of a body that is text (INV-09). */
function sectionParagraphs(policy: unknown): { index: number; lang: Lang; paragraphs: Paragraph[] }[] {
  const sections = (policy as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((section: unknown, index) => {
    const body = (section as { body?: unknown } | null)?.body;
    if (typeof body !== 'object' || body === null) return [];
    return LANGUAGES.flatMap((lang) => {
      const text = (body as Record<string, unknown>)[lang];
      return typeof text === 'string' ? [{ index, lang, paragraphs: paragraphsOf(text) }] : [];
    });
  });
}

/**
 * One INV-02 break in section `index` (from 0), in the run of text starting on body line `line` (from 0): a link
 * whose address is not https or email (`insecure`, `link` is the address), or text that looks like a link but is not
 * a readable `[text](address)` (`malformed`, `link` is the text as written).
 */
export interface PolicyLinkError {
  index: number;
  /** The version of the body it is in. */
  lang: Lang;
  line: number;
  kind: 'insecure' | 'malformed';
  link: string;
}

/** INV-02: every link-like place in the policy's sections that is not a valid https or email link. */
export const policyLinkErrors = (policy: unknown): PolicyLinkError[] =>
  sectionParagraphs(policy).flatMap(({ index, lang, paragraphs }) =>
    paragraphs.flatMap((p) =>
      runsOf(p).flatMap(({ line, text }) =>
        findLinks(text).flatMap((f) => (f.ok ? [] : [{ index, lang, line, kind: f.kind, link: f.link }])),
      ),
    ),
  );

/** One paragraph that mixes list lines with other lines: paragraph `paragraph` (from 0), starting on body line `line`. */
export interface PolicyMixedList {
  index: number;
  lang: Lang;
  paragraph: number;
  line: number;
}

/**
 * Paragraphs that mix "- " list lines with other lines (ADR-0005 note from F-018): a list needs a blank line before
 * it, so a list never shows as one run of text.
 */
export const policyMixedLists = (policy: unknown): PolicyMixedList[] =>
  sectionParagraphs(policy).flatMap(({ index, lang, paragraphs }) =>
    paragraphs.flatMap((p, paragraph) => (p.mixed ? [{ index, lang, paragraph, line: p.start }] : [])),
  );

/** The validated policy, with every section body parsed into blocks. */
export const parsePolicy = (raw: { title: Loc; updated: string; sections: { heading: Loc; body: Loc }[] }) =>
  ({
    title: raw.title,
    updated: raw.updated,
    sections: raw.sections.map((s) => ({
      heading: s.heading,
      blocks: { 'en-US': policyBlocks(s.body['en-US']), 'vi-VN': policyBlocks(s.body['vi-VN']) },
    })),
  }) satisfies Policy;
