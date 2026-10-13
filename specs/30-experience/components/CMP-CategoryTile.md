---
id: CMP-CategoryTile
title: Category tile
status: draft
tokens: [color.dark.catVioletBg, color.dark.catVioletFg, radius.lg, size.touchTarget]
---

## Purpose
Represent one category and take the user to its page.

## Anatomy
Icon in the category tint; category name; tool count (COPY-category.toolCount).

## Variants & states
| Variant / state | Description |
|---|---|
| regular | home row: tinted icon tile, name, count |
| compact | category navigation: small tinted icon and name, as a pill |
| current | compact, marked as the current category |
| hover/focus | lifts 1 px; 2 px accent focus ring |

## Behavior
The whole tile is one link to the category page (F-016).

## Accessibility
The link name reads "<name>, <count>". The tint is decorative. Touch targets per NFR-09.
