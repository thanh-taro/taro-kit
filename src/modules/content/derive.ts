// MOD-Content derived views: pure functions over normalized entries, shared by every consumer of the registry.
// No Node imports: the build uses them on the registry, and browser islands can use them on the catalog data
// file with the viewer's date (what's new, RULE-04). Every function drops hidden entries itself (RULE-06).
// Implements: F-001.R1 (an entry appears everywhere it belongs), F-001.R4 (hidden entries appear nowhere).

interface Listed {
  id: string;
  name: string;
  hidden?: boolean;
}
interface InCategory extends Listed {
  category: string;
}
interface Dated extends Listed {
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

/** RULE-04 window and cap. */
export const WHATS_NEW_DAYS = 30;
export const WHATS_NEW_MAX = 6;

/** Public pages listed in the site index (F-015.R1, F-015.R3; routes per MOD-Pages). */
export const PUBLIC_PAGES = ['/', '/tools/', '/projects/', '/about/', '/now/'] as const;

/** A tool's stable portal address (F-003.R1). */
export const toolPath = (id: string): string => `/t/${id}/`;
/** A category's stable portal address (F-016.R1). */
export const categoryPath = (id: string): string => `/tools/${id}/`;

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
/** Newest first; ties by name, then updated before added, so output is stable. */
const newestFirst = (a: DatedItem, b: DatedItem) =>
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

/** Days from `from` to `to`, both YYYY-MM-DD local dates. */
function daysBetween(from: string, to: string): number {
  const utc = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/**
 * RULE-04 what's new, seen on the viewer's local date `today` (YYYY-MM-DD), never the build date.
 * One item per visible tool, dated and labeled by its latest date (`updated` if present, otherwise `added`),
 * kept when that date is within the last 30 days counting today, newest first, at most 6.
 */
export function whatsNew(tools: readonly Dated[], today: string): DatedItem[] {
  return visibleTools(tools)
    .map((t): DatedItem => {
      const type = t.updated ? 'updated' : 'added';
      return { id: t.id, name: t.name, type, date: t.updated ?? t.added };
    })
    .filter((i) => daysBetween(i.date, today) < WHATS_NEW_DAYS)
    .sort(newestFirst)
    .slice(0, WHATS_NEW_MAX);
}

/** RULE-04 changelog items: one added and, if updated, one updated item per visible tool, newest first. */
export function changelogItems(tools: readonly Dated[]): DatedItem[] {
  return visibleTools(tools)
    .flatMap((t): DatedItem[] => [
      { id: t.id, name: t.name, type: 'added', date: t.added },
      ...(t.updated ? [{ id: t.id, name: t.name, type: 'updated' as const, date: t.updated }] : []),
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
 * Hidden entries and empty categories are left out (RULE-06).
 */
export function sitemapEntries(content: { categories: readonly Ordered[]; allTools: readonly InCategory[] }): string[] {
  return [
    ...PUBLIC_PAGES,
    ...visibleCategories(content.categories, content.allTools).map((c) => categoryPath(c.id)),
    ...visibleTools(content.allTools).map((t) => toolPath(t.id)),
  ];
}
