---
id: MOD-Search
title: Search and ranking
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-Search holds pure, synchronous search logic shared by the palette and the catalog.
- **Normalization** ignores case and diacritics: lower-case, then NFD, then strip combining marks, with an explicit mapping of `đ` and `Đ` to `d`, since those letters don't decompose.
- **Ranking** follows RULE-05: exact name, then name prefix, then name contains, then tag match, then summary contains. Ties go to favorites first, then name.
- **Grouping and caps** produce the Tools, Projects, Pages and Actions groups, at most 8 each.
- Normalized keys are precomputed at build (MOD-Content), so a keystroke costs one linear pass. That is under 1 ms for 500 entries on the reference device (NFR-02).

## Not responsible for
- UI, focus and keyboard handling (MOD-Palette, MOD-Pages).
- Deciding what is visible. Inputs are already visible-only.
- Fuzzy matching, which is deliberately absent (RULE-05 is deterministic).

## Public surface
In `src/modules/search/` (`index.ts`). Pure, synchronous and browser-safe; no Node imports.
- `normalize(text) → string`: lower-case, `đ`/`Đ` → `d`, NFD, combining marks stripped, whitespace trimmed and collapsed.
- `searchKeys({ name, tags?, summary? }) → SearchKeys` (`{ name, tags[], summary }`, each normalized). MOD-Content stores these on every tool and project in the catalog data file.
- `TIERS` (`exact`, `prefix`, `contains`, `tag`, `summary`, best first) and `matchTier(normalizedQuery, keys) → MatchTier | undefined`: an item takes its best tier. A tag matches when it starts with the query (RULE-05); name and summary "contains" are substring matches.
- `rank(query, items, { favorites }) → RankedItem[]` (`{ item, tier, favorite }`): the ranking core. Items are `Searchable` (`{ id, name, tags?, summary?, keys? }`); pre-computed `keys` are used as they are, otherwise they are computed. A blank query ranks nothing. Order: tier, then favorites first, then name (MOD-Content `byName`), then input order.
- `compareRanked(a, b)`: that order, for callers that merge or cap ranked lists.
- `filterCatalog(query, tools, context) → Tool[]`: `rank` over visible tools, mapped back to the tools (all categories, F-002.R4).
- `searchPalette(query, index, context) → Group[]` (F-004) is added on top of `rank` and `compareRanked` without changing them: rank each kind (tools, projects, pages, actions) separately, keep the group order Tools, Projects, Pages, Actions, and cap each group at 8. Favorites are tool ids, so pass them for the tools group only. As built (`palette.ts`): `index` is `{ tools, projects, pages, actions }` of `Searchable`; each group is `{ id, items }` with the items best first; groups with no match are left out, so a blank query or no match gives `[]`. `PALETTE_GROUPS` and `PALETTE_GROUP_MAX` (8) are exported.

## Implements
F-002.R4 and F-004.R3. It is the main contributor to NFR-02.
