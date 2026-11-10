---
id: CMP-ToolCard
title: Tool card
status: draft
tokens: [color.dark.surface, color.dark.tint, color.dark.accent, color.dark.accent2, radius.lg, size.toolIcon.md]
---

## Purpose
Represent one tool in lists and let the user open or favorite it.

## Anatomy
Icon; name; summary; category labels (one per category of the tool, the main category first, in the same order on every page; D-076); open-mode marker for linked tools (COPY-tool.opensNewTab); favorite toggle (CMP-FavoriteToggle).

## Variants & states
| Variant / state | Description |
|---|---|
| regular | catalog |
| compact | home favorites and recents: icon, name and favorite toggle; no category labels |
| unavailable | offline, and the tool is linked or not offline-capable: dimmed, with COPY-tool.unavailable |
| hover/focus/pressed | standard interaction feedback |

## Sizing
- The tool name always shows on one line, in every variant. A name too long for the card is shortened with an ellipsis.
- Every regular card has the same height, whatever its content, on every list and page: the summary shows at most four lines (a longer one is shortened with an ellipsis), and a shorter summary keeps the space of four lines, so the category labels sit at the same place on every card.
- The category labels and the open-mode marker share one line, the labels first. Labels show in order; from the first label that doesn't fit, it and every label after it fold into one more-label (COPY-tool.moreCategories, the number of folded labels), placed where the first folded label would be. The main category's label and the open-mode marker always show; the main label alone is shortened with an ellipsis if it doesn't fit. Every label stays available to assistive technology, and the full list shows as a tooltip on hover (D-076).
- In a row that also shows the summary (what's new on home), the name keeps its full width first and the summary gives way. What's-new rows show no category labels.
- A shortened name or summary stays whole for assistive technology (the link's name is the full tool name) and shows in full as a tooltip on hover (NFR-07).

## Behavior
Activating the card opens the tool (F-003). The favorite toggle does not open the tool.

## Accessibility
The card is one link whose name is the tool name; the favorite toggle is a separate button. Touch targets per NFR-09.
