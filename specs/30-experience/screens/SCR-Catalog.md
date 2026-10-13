---
id: SCR-Catalog
title: Catalog
status: draft
features: [F-002, F-005, F-016]
components: [CMP-AppShell, CMP-ToolCard, CMP-StateMessage, CMP-CategoryTile]
---

## Purpose
See every available tool, search them, and browse by category.

## Layout regions
1. Shell header.
2. Title (COPY-catalog.title) and search field (COPY-catalog.searchPlaceholder).
3. Category navigation (COPY-category.navLabel): compact CMP-CategoryTile per visible category, linking to category pages.
4. Tool groups by category, each heading a link to its category page, followed by CMP-ToolCard items.

## States
| State | When | What the user sees |
|---|---|---|
| default | visible tools exist | grouped tools |
| empty | no visible tools | CMP-StateMessage with COPY-catalog.empty |
| loading | n/a | local content |
| error | search has no matches | CMP-StateMessage with COPY-catalog.noResults and a clear action (COPY-catalog.clear) |

## Entry & exit
- Entered from: SCR-Category (all tools), shell navigation, the palette, the home invitation, SCR-NotFound.
- Exits to: SCR-ToolView, SCR-Category, or a tool's own address (linked tools).

## Accessibility
The result count is announced politely after filtering. The category navigation is a nav landmark of links.
