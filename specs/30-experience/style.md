---
title: Style — Night Market
status: draft
---

# Style — "Night Market" (decision D-019)

TaroKit should feel like a night market stall run by a developer: dark, glowing, fast and a little playful. Best-in-class keyboard launchers are the reference for precision; desktop operating-system materials are the reference for calm. All values live in `tokens.json`. This page states the intent behind them.

## Principles
1. **Dark first, light equal.** The dark theme is the hero. Light is a separate, considered palette, not an inversion. Every text pair passes WCAG AA in both themes (`tools/token_contrast.py`, NFR-03).
2. **Keyboard is visible.** Shortcuts appear as key caps (mono font, `surface2` fill, thicker bottom edge) wherever an action has one. Focus always shows a 2-px `accent` ring with offset (NFR-04).
3. **One glow, used sparingly.** The violet glow (`shadow.glow`, `bgGlow`) marks the hero area of a page, the palette and the selected palette row. It never appears on ordinary cards. Depth otherwise comes from hairlines (`line`) and surface steps (`bg` → `surface` → `surface2`).
4. **Playful in the details.** The wide display face is used only for headings and the logo. The mango accent (`accent2`) marks only favorites and "new/updated". Small motions: cards lift 1 px on hover, the palette scales in from 98 %.
5. **Crisp shapes.** Radii are `sm` for rows and key caps, `md` for controls, `lg` for cards and `xl` for windows and the palette. Pills are only for status labels.
6. **Dense but breathable.** 4-px spacing grid, 15-px body text, content at most `contentMax` wide, gutter of at least 16 px (NFR-07). Touch targets are at least 44 px (NFR-09).

## Type
- **Display:** Unbounded 500–600, for headings, greeting and logo. Never used for body text or below 20 px.
- **Body:** Manrope 400/600.
- **Mono:** JetBrains Mono, for key caps, dates, counts and ids.
- All are SIL OFL and self-hosted, with no third-party requests (NFR-05).

## Color roles
| Role | Use |
|---|---|
| `bg`, `bgGlow` | page background; the glow is a soft radial at the top right |
| `surface`, `surface2` | cards, inputs, palette; hover and active states |
| `line`, `lineStrong` | decorative dividers; borders that identify controls |
| `fg`, `muted` | primary and secondary text |
| `accent`, `onAccent` | links, selection, focus, primary buttons |
| `accent2`, `accent2Fg`, `tint2` | favorite star, added/updated pills |
| `tint`, `selection`, `selectionLine` | tool icon tiles, selected palette row |
| `danger`, `success` | destructive actions, confirmations |

## Motion
Durations are `fast` (hover, press), `base` (palette in/out, toggles) and `slow` (page-level fades). Easing is `standard` in and `exit` out. Under reduced motion, transitions are instant except opacity.

## Iconography
Simple 1.5-px stroke icons at 16 and 20 px, with rounded caps, from an open-licensed set chosen in architecture. Tool icons sit in a `tint` tile; a tool without an icon shows its monogram in mono.
