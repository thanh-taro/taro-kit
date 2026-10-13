---
id: CMP-CommandPalette
title: Command palette
status: draft
tokens: [color.dark.surface, color.dark.selection, color.dark.selectionLine, color.dark.scrim, radius.xl, size.paletteWidth, shadow.glow.dark, font.family.mono]
---

## Purpose
Keyboard-summoned search over tools, projects, pages and actions.

## Anatomy
Search field (COPY-palette.placeholder); result groups with headings (COPY-palette.groupFavorites, COPY-palette.groupRecents, COPY-palette.groupTools, COPY-palette.groupProjects, COPY-palette.groupPages, COPY-palette.groupActions); result rows; key hints in the footer (COPY-palette.hints).

## Variants & states
| Variant / state | Description |
|---|---|
| empty query | favorites, recents, pages |
| results | grouped results, with the first one highlighted |
| no results | COPY-palette.noResults with a browse-catalog action (COPY-palette.browseAll) |
| copied | COPY-palette.copied after the copy-address action |

## Behavior
Up and down keys move through results across groups, and Enter runs one. Actions: COPY-palette.actionTheme, COPY-palette.actionExport, COPY-palette.actionCopy. Escape or a click outside closes the palette and focus returns where it was.

## Accessibility
A modal dialog using the combobox and listbox pattern. The number of results is announced.
