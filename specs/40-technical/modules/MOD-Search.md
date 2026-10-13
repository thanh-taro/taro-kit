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
- `normalize(text) → string`.
- `rank(query, items, { favorites }) → RankedItem[]`.
- `searchPalette(query, index, context) → Group[]` and `filterCatalog(query, tools, categoryId, context) → Tool[]`.

## Implements
F-002.R4 and F-004.R3. It is the main contributor to NFR-02.
