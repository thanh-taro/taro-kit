---
id: CMP-FavoriteToggle
title: Favorite toggle
status: draft
tokens: [color.dark.accent2, color.dark.muted, size.touchTarget]
---

## Purpose
Pin or unpin a tool.

## Anatomy
A star icon button with an accessible label that changes with state (COPY-fav.add, COPY-fav.remove).

## Variants & states
| Variant / state | Description |
|---|---|
| off / on | not pinned / pinned |
| refused | the limit is reached: shows COPY-fav.full |

## Behavior
Toggles immediately. No confirmation is asked.

## Accessibility
A toggle button with a pressed state. Touch targets per NFR-09.
