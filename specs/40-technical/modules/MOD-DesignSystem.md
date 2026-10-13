---
id: MOD-DesignSystem
title: Design system
status: draft
depends_on: [MOD-Copy]
---

## Responsibility
MOD-DesignSystem owns the visual foundation and the shared presentational components.
- **Foundation:**
  - generated token CSS from `specs/30-experience/tokens.json` (ADR-0003);
  - the cascade-layer stack, reset and base typography;
  - self-hosted font faces;
  - inline SVG icons;
  - focus-visible styles;
  - reduced-motion handling;
  - the 44 px touch-target rules.
- **Components:** CMP-ToolCard (including its unavailable variant), CMP-ProjectCard, CMP-StateMessage, CMP-FavoriteToggle and CMP-ToolHeader.
- **Rendering:** Astro components for static parts, and Preact versions where an island needs them. Both share the same class contract and CSS.

## Not responsible for
- Page composition (MOD-Pages) and the shell frame (MOD-Shell).
- Data and state. Components get values and callbacks.
- The command palette's behavior (MOD-Palette).

## Public surface
- `tokens.css` and `tokens.ts`.
- The `<Icon name>` component.
- The components listed above, with props that mirror their component specs' anatomy and states.

## Implements
The shared parts of F-002.R2, F-005.R1, F-009.R2 and F-011.R3, plus CMP-ToolCard, CMP-ProjectCard, CMP-StateMessage, CMP-FavoriteToggle and CMP-ToolHeader. It is the main owner of NFR-03, NFR-07 and NFR-09.
