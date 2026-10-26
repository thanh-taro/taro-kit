// MOD-Search ranking core: RULE-05, shared by the catalog search (F-002) and the palette (F-004).
// Pure, synchronous and browser-safe. One linear pass per query over items that carry pre-normalized keys
// (the catalog data file, MOD-Content), so a keystroke stays far under NFR-02 with 500 entries.
// - Tiers, best first: exact name, name prefix, name contains, tag match (a tag starting with the query),
//   summary contains. An item takes its best tier; an item matching no tier is left out. No fuzzy matching.
// - Ties within a tier: favorites first, then name alphabetically (MOD-Content `byName`), then input order.
// - A blank query ranks nothing; callers show their no-query view instead.
// - Both languages (RULE-05, F-019.R5): the keys hold every distinct version of the name and summary, and an item
//   takes the best tier any version reaches; tags already list keywords in either language. Name ties sort by the
//   one-version name (MOD-Content `byName`, ADR-0012), so the order is the same in both languages.
// Callers decide visibility (inputs are visible-only, RULE-06) and any grouping or caps (the palette's 8).
// Implements: RULE-05, F-002.R4 (with filterCatalog), F-004.R3 (through searchPalette, built on rank), F-019.R5.
import { byName } from '../content/derive.ts';
import { versions, type Text } from '../language/languages.ts';
import { normalize } from './normalize.ts';

/** RULE-05 match tiers, best first. */
export const TIERS = ['exact', 'prefix', 'contains', 'tag', 'summary'] as const;
export type MatchTier = (typeof TIERS)[number];

/**
 * Pre-normalized search keys of one entry: `normalize` of each distinct version of its name (en-US, vi-VN), each tag,
 * and each distinct version of its summary (F-019.R5).
 */
export interface SearchKeys {
  name: string[];
  tags: string[];
  summary: string[];
}

/** Anything searchable: tools, pages or actions. `keys`, when present, are used as they are. */
export interface Searchable {
  id: string;
  name: Text;
  tags?: readonly string[];
  summary?: Text;
  keys?: SearchKeys;
}

export interface RankContext {
  /** Ids of the user's favorites (MOD-PersonalData), which win ties within a tier. */
  favorites?: Iterable<string>;
}

export interface RankedItem<T> {
  item: T;
  tier: MatchTier;
  favorite: boolean;
}

/** The keys the catalog data file carries for each entry (MOD-Content emits them at build). */
const distinct = (texts: string[]): string[] => [...new Set(texts.filter(Boolean))];

export function searchKeys(entry: { name: Text; tags?: readonly string[]; summary?: Text }): SearchKeys {
  return {
    name: distinct(versions(entry.name).map(normalize)),
    tags: (entry.tags ?? []).map(normalize),
    summary: distinct(versions(entry.summary ?? '').map(normalize)),
  };
}

/** The best RULE-05 tier at which `query` (already normalized) matches any version in `keys`, or undefined. */
export function matchTier(query: string, keys: SearchKeys): MatchTier | undefined {
  if (!query) return undefined;
  if (keys.name.some((n) => n === query)) return 'exact';
  if (keys.name.some((n) => n.startsWith(query))) return 'prefix';
  if (keys.name.some((n) => n.includes(query))) return 'contains';
  if (keys.tags.some((tag) => tag.startsWith(query))) return 'tag';
  if (keys.summary.some((s) => s.includes(query))) return 'summary';
  return undefined;
}

/** RULE-05 order between two ranked items: tier, then favorites first, then name (MOD-Content `byName`). */
export function compareRanked<T extends { name: Text }>(a: RankedItem<T>, b: RankedItem<T>): number {
  return (
    TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || Number(b.favorite) - Number(a.favorite) || byName(a.item, b.item)
  );
}

/** The items matching `query`, best first by RULE-05. The input is not changed. */
export function rank<T extends Searchable>(
  query: string,
  items: readonly T[],
  context: RankContext = {},
): RankedItem<T>[] {
  const q = normalize(query);
  if (!q) return [];
  const favorites = new Set(context.favorites ?? []);
  const ranked: RankedItem<T>[] = [];
  for (const item of items) {
    const tier = matchTier(q, item.keys ?? searchKeys(item));
    if (tier) ranked.push({ item, tier, favorite: favorites.has(item.id) });
  }
  // Array.prototype.sort is stable, so equal items keep their input order.
  return ranked.sort((a, b) => compareRanked(a, b));
}
