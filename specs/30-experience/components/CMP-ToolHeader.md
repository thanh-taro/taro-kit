---
id: CMP-ToolHeader
title: Tool header
status: draft
tokens: [color.dark.surface, color.dark.line, radius.md, size.touchTarget]
---

## Purpose
Slim bar above an embedded tool.

## Anatomy
Back to the previous page (COPY-tool.back); tool icon and name; favorite toggle; open-in-new-tab (COPY-tool.openNewTab). On narrow screens only, a search icon button (COPY-shell.search) before the favorite toggle opens the palette, since the shell bar with its search control is hidden there (F-004.R1).

## Variants & states
| Variant / state | Description |
|---|---|
| default | as above |
| slow | also shows COPY-tool.slow inline |

## Behavior
Open-in-new-tab is always visible, never hidden in a menu.

## Accessibility
A toolbar role with a label. Each action has a text label.
