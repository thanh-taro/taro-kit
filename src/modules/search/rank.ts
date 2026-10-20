// MOD-Search ranking core: RULE-05, shared by the catalog search (F-002) and the palette (F-004).
// Pure, synchronous and browser-safe. One linear pass per query over items that carry pre-normalized keys
// (the catalog data file, MOD-Content), so a keystroke stays far under NFR-02 with 500 entries.
// - Tiers, best first: exact name, name prefix, name contains, tag match (a tag starting with the query),
//   summary contains. An item takes its best tier; an item matching no tier is left out. No fuzzy matching.
// - Ties within a tier: favorites first, then name alphabetically (MOD-Content `byName`), then input order.
// - A blank query ranks nothing; callers show their no-query view instead.
// Callers decide visibility (inputs are visible-only, RULE-06) and any grouping or caps (the palette's 8).
// Implements: RULE-05, F-002.R4 (with filterCatalog), F-004.R3 (through searchPalette, built on rank).
import { byName } from '../content/derive.ts';
import { normalize } from './normalize.ts';

/** RULE-05 match tiers, best first. */
export const TIERS = ['exact', 'prefix', 'contains', 'tag', 'summary'] as const;
export type MatchTier = (typeof TIERS)[number];

/** Pre-normalized search keys of one entry (`normalize` of its name, each tag and its summary). */
export interface SearchKeys {
  name: string;
  tags: string[];
  summary: string;
}

/** Anything searchable: tools, pages or actions. `keys`, when present, are used as they are. */
export interface Searchable {
  id: string;
  name: string;
  tags?: readonly string[];
  summary?: string;
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
export function searchKeys(entry: { name: string; tags?: readonly string[]; summary?: string }): SearchKeys {
  return {
    name: normalize(entry.name),
    tags: (entry.tags ?? []).map(normalize),
    summary: normalize(entry.summary ?? ''),
  };
}

/** The best RULE-05 tier at which `query` (already normalized) matches `keys`, or undefined. */
export function matchTier(query: string, keys: SearchKeys): MatchTier | undefined {
  if (!query) return undefined;
  if (keys.name === query) return 'exact';
  if (keys.name.startsWith(query)) return 'prefix';
  if (keys.name.includes(query)) return 'contains';
  if (keys.tags.some((tag) => tag.startsWith(query))) return 'tag';
  if (keys.summary.includes(query)) return 'summary';
  return undefined;
}

/** RULE-05 order between two ranked items: tier, then favorites first, then name. */
export function compareRanked<T extends { name: string }>(a: RankedItem<T>, b: RankedItem<T>): number {
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
  return ranked.sort(compareRanked);
}
