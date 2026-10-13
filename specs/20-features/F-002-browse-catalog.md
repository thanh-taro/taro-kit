---
id: F-002
title: Browse the catalog
status: ready
milestone: M-1
priority: P0
personas: [PER-01, PER-02]
entities: [ENT-Tool, ENT-Category]
rules: [RULE-05, RULE-06]
screens: [SCR-Catalog]
components: [CMP-ToolCard, CMP-StateMessage]
nfr: [NFR-02]
events: []
depends_on: [F-001]
---

## Intent
Visitors and the Owner can see everything that is available, grouped so it can be scanned quickly, and narrow it down by typing (PRN-02).

## Scope
- In: listing visible tools by category, filtering by category, search inside the catalog, empty and no-results states.
- Out: the global command palette (F-004); opening a tool (F-003); per-tool detail pages (M-2).

## Requirements
- **R1** With no query, the catalog lists every visible tool grouped by category, in category order, and alphabetically within a category.
- **R2** Each listed tool shows its name, summary, icon, category, whether it opens in a new tab, and whether it is a favorite.
- **R3** The user can narrow the list to one category and return to all categories. The chosen category is part of the page address, so it can be shared and survives a reload. An unknown category in the address falls back to all categories.
- **R4** While a query is entered, the catalog shows a single list ranked by RULE-05 within the selected category, updating as the user types.
- **R5** When nothing matches, the catalog says so and offers to clear the search (COPY-catalog.noResults, COPY-catalog.clear).
- **R6** When the catalog has no visible tools, an empty state explains that tools are coming (COPY-catalog.empty).

## Acceptance criteria
- **AC1** Given tools in two categories, when the catalog opens, then tools appear under their category headings, in category order and alphabetically within each. (R1)
- **AC2** Given a linked tool, when it is listed, then it is marked as opening in a new tab. (R2)
- **AC3** Given the user selects the Converters category, when the page reloads, then only Converters tools are listed and the category is still selected. (R3)
- **AC4** Given an address with an unknown category, when the catalog opens, then all categories are shown. (R3)
- **AC5** Given tools named "JSON Formatter" and "Base64", when the user types "json", then "JSON Formatter" is listed and "Base64" is not. (R4)
- **AC6** Given the Converters category is selected and a Developer tool matches the query, when the user types, then the Developer tool is not listed. (R4)
- **AC7** Given a search with no matches, when the results update, then the no-results message and the clear-search action are shown. (R5)
- **AC8** Given no visible tools, when the catalog opens, then the empty state is shown. (R6)

## UX notes
SCR-Catalog uses CMP-ToolCard for each tool and CMP-StateMessage for empty and no-results. Filtering must feel instant (NFR-02).

## Edge cases
- A very long name or summary is truncated, with the full text still available to assistive technology.
