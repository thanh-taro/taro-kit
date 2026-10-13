---
id: SCR-Category
title: Category page
status: draft
features: [F-016, F-005]
components: [CMP-AppShell, CMP-CategoryTile, CMP-ToolCard, CMP-StateMessage]
---

## Purpose
See every tool of one kind, introduced by Taro.

## Layout regions
1. Shell header (Tools is the current navigation item).
2. Category hero in the category tint: icon, name, intro (the category's own text), tool count (COPY-category.toolCount).
3. Category navigation (COPY-category.navLabel): compact CMP-CategoryTile for each visible category (the current one is marked), plus a link to all tools (COPY-category.allTools).
4. Tool list: CMP-ToolCard items, alphabetical.

## States
| State | When | What the user sees |
|---|---|---|
| default | category has visible tools | the regions above |
| empty | n/a | a category with no visible tools is not found (F-016.R5) |
| loading | n/a | local content |
| error | unknown or empty category | SCR-NotFound content at the same address |

## Entry & exit
- Entered from: the home category row, catalog headings and navigation, a shared link.
- Exits to: SCR-ToolView, other category pages, SCR-Catalog.

## Accessibility
The category name is the page heading. The navigation is a nav landmark; the current category has aria-current. The tint is decorative and never the only cue.
