// MOD-Search public surface (specs/40-technical/modules/MOD-Search.md). Pure and browser-safe.
export { normalize } from './normalize.ts';
export {
  compareRanked,
  matchTier,
  rank,
  searchKeys,
  TIERS,
  type MatchTier,
  type RankContext,
  type RankedItem,
  type Searchable,
  type SearchKeys,
} from './rank.ts';
export { filterCatalog } from './catalog.ts';
export {
  PALETTE_GROUP_MAX,
  PALETTE_GROUPS,
  searchPalette,
  type PaletteGroup,
  type PaletteGroupId,
  type PaletteIndex,
} from './palette.ts';
