---
id: F-016
title: Browse a category
status: ready
milestone: M-1
priority: P0
personas: [PER-01, PER-02]
entities: [ENT-Category, ENT-Tool]
rules: [RULE-06, RULE-14]
screens: [SCR-Category, SCR-NotFound]
components: [CMP-ToolCard, CMP-CategoryTile, CMP-StateMessage]
nfr: [NFR-01, NFR-03, NFR-06]
events: []
depends_on: [F-001]
---

## Intent
Every tool lives in exactly one category, and each category is a place of its own: a page where Taro introduces that kind of tool and lists them. Visitors can scan the toolkit by what a tool is for, and the Owner can share a link to "all my media tools" (PRN-02, PRN-04).

## Scope
- In: one page per visible category, with its intro, icon and tint, its visible tools, and moving between categories.
- Out: the all-tools catalog and search (F-002); the home category row (F-007); multiple categories per tool (not planned, INV-07).

## Requirements
- **R1** Every visible category has a stable portal address built from its id. Visiting it shows the category page.
- **R2** The category page shows the category's name, icon, tint and intro in Taro's voice, and the number of visible tools in it (COPY-category.toolCount, or COPY-category.toolCountOne for one tool).
- **R3** The category page lists the category's visible tools alphabetically (F-002.R1), each shown as in F-002.R2.
- **R4** The category page lets the user move to any other visible category and back to all tools (COPY-category.allTools).
- **R5** An unknown category, or one with no visible tools, shows the not-found state (RULE-06).

## Acceptance criteria
- **AC1** Given the visible category "media", when the user visits its portal address, then the Media tools page is shown. (R1)
- **AC2** Given the Media tools category with 3 visible tools, when its page opens, then the name, icon, tint, intro and "3 tools" are shown. (R2)
- **AC3** Given tools "Clip Maker" and "Audio Trimmer" in Media tools, when the page opens, then "Audio Trimmer" is listed before "Clip Maker", each as a tool card. (R3)
- **AC4** Given the Media tools page, when the user chooses Developer tools in the category navigation, then the Developer tools page opens; when the user chooses all tools, then the catalog opens. (R4)
- **AC5** Given the category "does-not-exist", when the user visits its address, then the not-found state is shown. (R5)
- **AC6** Given a category whose tools are all hidden, when the user visits its address, then the not-found state is shown. (R5)

## UX notes
SCR-Category. The header uses the category tint (RULE-14). Tools use CMP-ToolCard; the category navigation uses CMP-CategoryTile in its compact form.

## Edge cases
- A category with exactly one visible tool reads "1 tool".
