---
id: F-002
title: Browse the catalog
status: draft
milestone: M-1
priority: P0
personas: [PER-01, PER-02]
entities: [ENT-Tool, ENT-Category]
rules: [RULE-05, RULE-06]
screens: [SCR-Catalog]
components: [CMP-ToolCard, CMP-StateMessage]
nfr: [NFR-02]
events: []
depends_on: [F-001, F-016]
---

## Intent
Visitors and the Owner can see everything that is available, grouped so it can be scanned quickly, and narrow it down by typing (PRN-02).

## Scope
- In: listing visible tools by category, navigation to category pages, search inside the catalog, empty and no-results states.
- Out: category pages themselves (F-016); the global command palette (F-004); opening a tool (F-003); per-tool detail pages (M-2).

## Requirements
- **R1** With no query, the catalog lists every visible tool grouped by category, in category order, and alphabetically within a category.
- **R2** Each listed tool shows its name, summary, icon, category, whether it opens in a new tab, and whether it is a favorite.
- **R3** The catalog offers a way to jump to each visible category's page (F-016), and every category heading links to that page.
- **R4** While a query is entered, the catalog shows a single list ranked by RULE-05 across all categories, updating as the user types. Each result shows its category.
- **R5** When nothing matches, the catalog says so and offers to clear the search (COPY-catalog.noResults, COPY-catalog.clear).
- **R6** When the catalog has no visible tools, an empty state explains that tools are coming (COPY-catalog.empty).

## Acceptance criteria
- **AC1** Given tools in two categories, when the catalog opens, then tools appear under their category headings, in category order and alphabetically within each. (R1)
- **AC2** Given a linked tool, when it is listed, then it is marked as opening in a new tab. (R2)
- **AC3** Given the catalog, when the user chooses "Converters & calculators" in the category navigation, then that category's page opens. (R3)
- **AC4** Given the catalog, when the user activates the "Media tools" heading, then the Media tools category page opens. (R3)
- **AC5** Given tools named "JSON Formatter" and "Base64", when the user types "json", then "JSON Formatter" is listed and "Base64" is not. (R4)
- **AC6** Given tools in two categories match the query, when the user types, then both are listed in one ranked list, each with its category label. (R4)
- **AC7** Given a search with no matches, when the results update, then the no-results message and the clear-search action are shown. (R5)
- **AC8** Given no visible tools, when the catalog opens, then the empty state is shown. (R6)

## UX notes
SCR-Catalog uses CMP-ToolCard for each tool and CMP-StateMessage for empty and no-results. Filtering must feel instant (NFR-02).

## Edge cases
- A very long name or summary is truncated, with the full text still available to assistive technology.
