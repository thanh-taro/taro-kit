---
id: CMP-ToolCard
title: Tool card
status: draft
tokens: [color.dark.surface, color.dark.tint, color.dark.accent, color.dark.accent2, radius.lg, size.toolIcon.md]
---

## Purpose
Represent one tool in lists and let the user open or favorite it.

## Anatomy
Icon; name; summary; category label; open-mode marker for linked tools (COPY-tool.opensNewTab); favorite toggle (CMP-FavoriteToggle).

## Variants & states
| Variant / state | Description |
|---|---|
| regular | catalog |
| compact | home favorites and recents: icon, name and favorite toggle |
| unavailable | offline, and the tool is linked or not offline-capable: dimmed, with COPY-tool.unavailable |
| hover/focus/pressed | standard interaction feedback |

## Behavior
Activating the card opens the tool (F-003). The favorite toggle does not open the tool.

## Accessibility
The card is one link whose name is the tool name; the favorite toggle is a separate button. Touch targets per NFR-09.
