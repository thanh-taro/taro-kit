// MOD-Search catalog search: one RULE-05-ranked list across every category (F-002.R4).
// Implements: F-002.R4.
import { rank, type RankContext, type Searchable } from './rank.ts';

/** The visible tools matching `query`, best first (RULE-05); a blank query returns none. */
export function filterCatalog<T extends Searchable>(
  query: string,
  tools: readonly T[],
  context: RankContext = {},
): T[] {
  return rank(query, tools, context).map((r) => r.item);
}
