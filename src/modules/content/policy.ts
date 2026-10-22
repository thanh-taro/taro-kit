// MOD-Content: the privacy policy and the terms of use (ENT-Policy) as the rest of the portal reads them. Pure, no
// Node imports. The body format is the ADR-0005 note from F-018: paragraphs separated by blank lines; a paragraph
// whose every line starts with "- " is a bulleted list, one item per line; inline links are `[text](address)` with
// an https or mailto address. Any other text, other bracket syntax included, is literal text. No Markdown engine.
// Implements: F-018.R1, F-018.R2 (sections parsed into blocks), F-018.R5 (INV-02 on policy links, mixed list
// paragraphs, sections named "section <n>").

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
  heading: string;
  blocks: PolicyBlock[];
}
/** A validated policy with each section's body parsed into blocks (MOD-Content `Registry.privacy`, `.terms`). */
export interface Policy {
  title: string;
  /** The last updated date, YYYY-MM-DD. */
  updated: string;
  sections: PolicySection[];
}

/** F-018.R5: a section is named by its position, counting from 1 ("section 2"). */
export const policySectionName = (index: number): string => `section ${index + 1}`;

/** Anything that looks like an inline link: `[text](address)`, with no spaces or parentheses in the address. */
const LINK = /\[([^\]\n]+)\]\(([^()\s]+)\)/g;
const LIST_LINE = /^- /;

/** INV-02: a policy link is a secure web address (https) or an email link. */
const linkAllowed = (href: string): boolean =>
  (href.startsWith('https://') && URL.canParse(href)) || /^mailto:[^\s]+$/.test(href);

/** A body's paragraphs: runs of lines separated by blank lines, each with the index of its first line. */
function paragraphLines(body: string): { start: number; lines: string[] }[] {
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
  return out;
}

function parts(text: string): PolicyPart[] {
  const out: PolicyPart[] = [];
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    const [whole, label, href] = m as unknown as [string, string, string];
    if (!linkAllowed(href)) continue; // never reached in a valid policy: policyLinkErrors rejects it (INV-02)
    if (m.index > at) out.push({ kind: 'text', text: text.slice(at, m.index) });
    out.push({ kind: 'link', text: label, href, newTab: href.startsWith('https://') });
    at = m.index + whole.length;
  }
  if (at < text.length) out.push({ kind: 'text', text: text.slice(at) });
  return out;
}

/**
 * A section body as blocks (ENT-Policy): each paragraph, or each bulleted list (a paragraph whose every line starts
 * with "- "), with its text and links. Lines inside a paragraph join with a space, as the page shows them.
 */
export function policyBlocks(body: string): PolicyBlock[] {
  return paragraphLines(body).map(({ lines }): PolicyBlock =>
    lines.every((l) => LIST_LINE.test(l))
      ? { kind: 'list', items: lines.map((l) => parts(l.replace(LIST_LINE, '').trim())) }
      : { kind: 'paragraph', parts: parts(lines.join(' ')) },
  );
}

/** One INV-02 break: a link in section `index` (from 0), on line `line` of its body (from 0). */
export interface PolicyLinkError {
  index: number;
  line: number;
  href: string;
}

/** INV-02: every link in the policy's sections whose address is not https or an email link. */
export function policyLinkErrors(policy: unknown): PolicyLinkError[] {
  const sections = (policy as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections)) return [];
  const out: PolicyLinkError[] = [];
  sections.forEach((section: unknown, index) => {
    const body = (section as { body?: unknown } | null)?.body;
    if (typeof body !== 'string') return;
    body.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(LINK)) if (!linkAllowed(m[2]!)) out.push({ index, line: i, href: m[2]! });
    });
  });
  return out;
}

/** One paragraph that mixes list lines with other lines: paragraph `paragraph` (from 0), starting on body line `line`. */
export interface PolicyMixedList {
  index: number;
  paragraph: number;
  line: number;
}

/**
 * Paragraphs that mix "- " list lines with other lines (ADR-0005 note from F-018): a list needs a blank line before
 * it, so a list never shows as one run of text.
 */
export function policyMixedLists(policy: unknown): PolicyMixedList[] {
  const sections = (policy as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections)) return [];
  const out: PolicyMixedList[] = [];
  sections.forEach((section: unknown, index) => {
    const body = (section as { body?: unknown } | null)?.body;
    if (typeof body !== 'string') return;
    paragraphLines(body).forEach(({ start, lines }, paragraph) => {
      const listLines = lines.filter((l) => LIST_LINE.test(l)).length;
      if (listLines > 0 && listLines < lines.length) out.push({ index, paragraph, line: start });
    });
  });
  return out;
}

/** The validated policy, with every section body parsed into blocks. */
export const parsePolicy = (raw: { title: string; updated: string; sections: { heading: string; body: string }[] }) =>
  ({
    title: raw.title,
    updated: raw.updated,
    sections: raw.sections.map((s) => ({ heading: s.heading, blocks: policyBlocks(s.body) })),
  }) satisfies Policy;
