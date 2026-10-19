---
id: ADR-0003
title: Plain modern CSS with design tokens compiled to custom properties
status: accepted
date: 2026-10-13
supersedes: []
---

## Context
The design phase will deliver W3C DTCG tokens in `specs/30-experience/tokens.json`. Requirements on styling:
- Light and dark themes must both meet WCAG 2.2 AA (NFR-03).
- The stored theme must be applied before first paint (F-012.R4).
- Layouts must work from 320 px to 2560 px at 200 % zoom (NFR-07), with 44 px touch targets (NFR-09).
- CSS must stay small for NFR-11, and no styles may be fetched from third parties (NFR-05).
- Only the latest two versions of each engine are supported (NFR-10), so native nesting, cascade layers, container queries, `:has()` and `color-mix()` are all available.

## Decision
- Write **plain CSS**: Astro component-scoped styles plus a small global layer stack (`reset, tokens, base, components, utilities`) using `@layer`.
- **Style Dictionary 5** (Apache-2.0, dev only) compiles `tokens.json` into `tokens.css`. The output is custom properties under `:root`, with theme overrides under `[data-theme="dark"]` and a `prefers-color-scheme` block for `system`. It also emits a typed `tokens.ts` for the rare script needs. Type sizes go to `tokens.css` in `rem` (px ÷ 16) so they follow the browser's text size; `tokens.json` and `tokens.ts` keep px (QA amendment, 2026-10-19).
- The theme is applied by setting `data-theme` on `<html>` from an inline, CSP-hashed head script (MOD-Theme). `color-scheme` is declared so native controls follow.
- Icons are SVGs taken from the icon set (ADR-0008) and **inlined at build**, so there are no icon fonts and no sprite requests. Fonts are self-hosted WOFF2 files, subset to Latin + Latin Extended + Vietnamese, with `font-display: swap` and a preload for the single primary face.

## Alternatives considered
- **Tailwind CSS v4.** It is MIT, popular and fast. But tokens would be restated in `@theme`, so they would have two homes. Markup gets noisy, and it adds an engine dependency for a site with about eight screens. We gain nothing over scoped CSS here.
- **vanilla-extract or other CSS-in-TS.** It gives type-safe styles, but adds a build plugin and a second styling idiom. Runtime CSS-in-JS is ruled out by NFR-11 and by the CSP.
- **UnoCSS or Open Props.** Atomic or preset systems that would compete with the design's own tokens.
- **A hand-written token script.** A DTCG-to-CSS script is about 60 lines, but Style Dictionary handles aliases, composite tokens and DTCG edge cases. It is the boring, maintained choice.

## Consequences
- One source of truth for tokens (`tokens.json`). Generated CSS is never edited by hand, and CI fails if the generated output is stale.
- Each theme is verified by the automated accessibility audit (ADR-0006).
- No utility classes means styles live next to their components. Shared patterns become components (MOD-DesignSystem), not class soup.
- The font family is a design-phase choice. It must be OFL or another permissive license and be registered in `dependencies.md` before use.

## Amendments from spike SP-6 (2026-10-13): font subsetting
Shipping Fontsource subsets as-is fails the NFR-11 headroom: the home page is 193 KB with Vietnamese text, because the latin-ext and Vietnamese ranges overlap. Fonts are subset at build time with fonttools:
- **Manrope**: variable, weights 400–700, Latin core + Vietnamese.
- **Unbounded**: static 600, Latin core + Vietnamese (headings may contain Vietnamese).
- **JetBrains Mono**: 400–600, ASCII only, code ligatures off.
- No latin-ext. A CI check rejects any other font file in `dist/`.
- Loading: `font-display: swap`, and preload Manrope Latin only.

Measured on the reference profile: home transfer 74 KB (EN) and 87 KB (VI), of which fonts are 39–52 KB, JS 15 KB, CSS 3 KB and the catalog 12 KB at 500 entries.

## Note from the scaffold (2026-10-14)
- Generated tokens put the dark theme on `:root` and the light theme under `[data-theme="light"]` (adapters/design.md), with a `prefers-color-scheme` fallback for when no script has run.
