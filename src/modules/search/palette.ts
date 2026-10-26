// MOD-Search palette search: the query groups of the command palette (F-004.R3), built on the ranking core.
// - Each kind (tools, pages, actions) is ranked separately by `rank` (RULE-05), so a page never pushes a tool
//   out; groups keep the order Tools, Pages, Actions.
// - Each group holds at most 8 results (RULE-05, PALETTE_GROUP_MAX); groups with no match are left out, so an
//   empty result means "no results" (F-004.R6).
// - Favorites are tool ids, so they break ties in the tools group only.
// Inputs are already visible-only (RULE-06). Pure, synchronous and browser-safe.
// Implements: F-004.R3, RULE-05 (per-group cap).
import { rank, type RankContext, type Searchable } from './rank.ts';

/** The palette's query groups, in display order (F-004.R3). */
export const PALETTE_GROUPS = ['tools', 'pages', 'actions'] as const;
export type PaletteGroupId = (typeof PALETTE_GROUPS)[number];

/** RULE-05: the palette shows at most 8 results per group. */
export const PALETTE_GROUP_MAX = 8;

/** Everything the palette can search, one list per kind. */
export type PaletteIndex = { readonly [K in PaletteGroupId]: readonly Searchable[] };

/** One non-empty group of ranked results, best first. */
export type PaletteGroup<I extends PaletteIndex = PaletteIndex> = {
  [K in PaletteGroupId]: { id: K; items: I[K][number][] };
}[PaletteGroupId];

/** The palette's groups for `query`: Tools, Pages, Actions, each ranked and capped; a blank query gives none. */
export function searchPalette<I extends PaletteIndex>(
  query: string,
  index: I,
  context: RankContext = {},
): PaletteGroup<I>[] {
  const groups: PaletteGroup<I>[] = [];
  for (const id of PALETTE_GROUPS) {
    const ranked = rank(query, index[id], id === 'tools' ? context : { lang: context.lang });
    if (ranked.length === 0) continue;
    const items = ranked.slice(0, PALETTE_GROUP_MAX).map((r) => r.item);
    groups.push({ id, items } as PaletteGroup<I>);
  }
  return groups;
}
