// MOD-Content derived views: pure functions over normalized entries, shared by every consumer of the registry.
// No Node imports, and nothing relative to the viewer's date (that is MOD-Pages', in the browser).
// Every function drops hidden entries itself (RULE-06).
// Implements: F-001.R1 (an entry appears everywhere it belongs), F-001.R4 (hidden entries appear nowhere).
import { pick, type Text } from '../language/languages.ts';
import { PRIVACY_PATH, TERMS_PATH } from './policy.ts';
import { RESUME_PATH } from './resume.ts';

export interface Listed {
  id: string;
  name: string;
  hidden?: boolean;
}
interface InCategory extends Listed {
  category: string;
}
export interface Dated extends Listed {
  added: string;
  updated?: string;
}
interface Ordered {
  id: string;
  order: number;
}

/** One dated item of what's new or the changelog (RULE-04). */
export interface DatedItem {
  id: string;
  name: string;
  type: 'added' | 'updated';
  /** ISO date, YYYY-MM-DD. */
  date: string;
}
export interface ChangelogMonth {
  /** YYYY-MM. */
  month: string;
  items: DatedItem[];
}

/** Public pages listed in the site index (F-015.R1, F-015.R3; routes per MOD-Pages), Privacy and Terms last (F-018.R4). */
export const PUBLIC_PAGES = ['/', '/tools/', '/about/', '/now/', PRIVACY_PATH, TERMS_PATH] as const;

/** A tool's stable portal address (F-003.R1). */
export const toolPath = (id: string): string => `/t/${id}/`;
/** A category's stable portal address (F-016.R1). */
export const categoryPath = (id: string): string => `/tools/${id}/`;

/** Alphabetical by name, the same in Node and every browser locale. */
/** Alphabetical by name; a name per language sorts by its en-US version (INV-09: a tool's name is one text). */
export const byName = (a: { name: Text }, b: { name: Text }) =>
  pick(a.name, 'en-US').localeCompare(pick(b.name, 'en-US'), 'en');
/** Newest first; ties by name, then updated before added, so output is stable. */
export const newestFirst = (a: DatedItem, b: DatedItem) =>
  b.date.localeCompare(a.date) || byName(a, b) || b.type.localeCompare(a.type);

/** Visible tools, alphabetically (RULE-06, F-002.R1). */
export function visibleTools<T extends Listed>(tools: readonly T[]): T[] {
  return tools.filter((t) => !t.hidden).sort(byName);
}

/** Visible tools of one category, alphabetically (F-016.R3). */
export function toolsByCategory<T extends InCategory>(tools: readonly T[], categoryId: string): T[] {
  return visibleTools(tools).filter((t) => t.category === categoryId);
}

/** Categories with at least one visible tool, in display order (RULE-06, D-027). */
export function visibleCategories<C extends Ordered>(categories: readonly C[], tools: readonly InCategory[]): C[] {
  const used = new Set(visibleTools(tools).map((t) => t.category));
  return categories.filter((c) => used.has(c.id)).sort((a, b) => a.order - b.order);
}

/**
 * RULE-04 changelog items: one added and, if updated, one updated item per visible tool, newest first.
 * A tool added and updated on the same day appears only as added (F-010 edge case).
 */
export function changelogItems(tools: readonly Dated[]): DatedItem[] {
  return visibleTools(tools)
    .flatMap((t): DatedItem[] => [
      { id: t.id, name: t.name, type: 'added', date: t.added },
      ...(t.updated && t.updated !== t.added
        ? [{ id: t.id, name: t.name, type: 'updated' as const, date: t.updated }]
        : []),
    ])
    .sort(newestFirst);
}

/** RULE-04 changelog, grouped by month, newest month first (F-010.R3). */
export function changelog(tools: readonly Dated[]): ChangelogMonth[] {
  const months: ChangelogMonth[] = [];
  for (const item of changelogItems(tools)) {
    const month = item.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.month === month) last.items.push(item);
    else months.push({ month, items: [item] });
  }
  return months;
}

/**
 * Site index paths (F-015.R3): public pages, visible category pages and visible tools' portal addresses.
 * Hidden entries and empty categories are left out (RULE-06). The Résumé page is listed, after About, only when
 * there is a résumé (`Registry.resume`, F-017.R6, F-017.AC8). The Privacy and Terms pages are the last public pages
 * (F-018.R4).
 */
export function sitemapEntries(content: {
  categories: readonly Ordered[];
  allTools: readonly InCategory[];
  resume?: object;
}): string[] {
  const pages: string[] = [...PUBLIC_PAGES];
  if (content.resume) pages.splice(pages.indexOf('/about/') + 1, 0, RESUME_PATH);
  return [
    ...pages,
    ...visibleCategories(content.categories, content.allTools).map((c) => categoryPath(c.id)),
    ...visibleTools(content.allTools).map((t) => toolPath(t.id)),
  ];
}
