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

## Sizing
- The tool name always shows on one line, in every variant. A name too long for the card is shortened with an ellipsis.
- Every regular card has the same height, whatever its content, on every list and page: the summary shows at most four lines (a longer one is shortened with an ellipsis), and a shorter summary keeps the space of four lines, so the category label sits at the same place on every card.
- In a row that also shows the summary (what's new on home), the name keeps its full width first and the summary gives way.
- A shortened name or summary stays whole for assistive technology (the link's name is the full tool name) and shows in full as a tooltip on hover (NFR-07).

## Behavior
Activating the card opens the tool (F-003). The favorite toggle does not open the tool.

## Accessibility
The card is one link whose name is the tool name; the favorite toggle is a separate button. Touch targets per NFR-09.
