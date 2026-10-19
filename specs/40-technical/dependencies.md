---
title: Dependency and asset registry
status: draft
---

# Dependency and asset registry

The policy is ADR-0008. Register every direct dependency and bundled asset pack here **before** using it. Status values: `candidate` (proposed in phase 3, not yet installed), `approved`, `removed`. IDs are never reused.

The npm versions listed were checked on 2026-10-13. **Scope** values:
- `runtime`: code or assets shipped to browsers;
- `build`: runs during the build but is not shipped;
- `dev`: tests, lint and tooling;
- `ci`: GitHub Actions only.

## Framework and build

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-01** | astro | ^7.3 | Static site generator, islands, per-page CSP hashes | build (+ tiny island runtime shipped) | MIT | approved | ADR-0002 |
| **DEP-02** | @astrojs/preact | ^6.0 | Preact islands integration | build | MIT | approved | ADR-0002 |
| **DEP-03** | preact | ~10.29 (pinned to 10.x) | UI runtime for islands | runtime | MIT | approved | ADR-0002 |
| **DEP-04** | @preact/signals | ^2.11 | Shared reactive stores across islands | runtime | MIT | approved | ADR-0002 |
| **DEP-05** | typescript | ~6.0 (pinned until astro check supports 7) | Type checking | dev | Apache-2.0 | approved | ADR-0002 |
| **DEP-06** | @astrojs/check | ^0.9 | Type-checks `.astro` files | dev | MIT | approved | ADR-0002 |
| **DEP-31** | sharp (pulls @img/sharp-libvips) | ^0.35.5 (direct: pnpm does not hoist astro's optional sharp, and Astro's bundled image service resolves it from the project root) | Image optimization for avatar and project images; rasterizing the shared link-preview image (MOD-Meta) | build | Apache-2.0; libvips binaries LGPL-3.0-or-later (build-only exception) | approved | ADR-0008 |

## Content and validation

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-07** | yaml | ^2.9 | Parse content files | build | ISC | approved | ADR-0005 |
| **DEP-08** | ajv | ^8.20 | Validate content against the domain JSON Schema. Its standalone output is the backup validator. | build (+ standalone validator shipped) | MIT | approved | ADR-0005 |
| **DEP-09** | ajv-formats | ^3.0 | `date`, `date-time` and `uri` format checks | build (+ shipped inside the standalone validator) | MIT | approved | ADR-0005 |
| **DEP-10** | json-schema-to-typescript | ^16.0 | Generate TS types from the domain schema | dev | MIT | approved | ADR-0005 |

## Offline

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-11** | workbox-build | ^7.4 | Inject the precache manifest after `astro build` | build | MIT | approved | ADR-0004 |
| **DEP-12** | workbox-precaching, workbox-routing, workbox-strategies, workbox-core | ^7.4 | Service worker runtime | runtime (inside `sw.js`) | MIT | approved | ADR-0004 |
| **DEP-13** | workbox-window | ^7.4 | SW registration and the update-ready signal | runtime | MIT | approved | ADR-0004 |

## Styling and assets

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-14** | style-dictionary | ^5.6 | Compile DTCG tokens to CSS custom properties | dev | Apache-2.0 | approved | ADR-0003 |
| **DEP-15** | lucide-static | ^1.55 | SVG icon set, inlined at build | runtime (asset) | ISC | approved | ADR-0003 |
| **DEP-16** | ~~UI typeface placeholder~~, replaced by DEP-33 to DEP-35 once the style was chosen (D-019) | n/a | n/a | n/a | n/a | removed | D-019 |
| **DEP-17** | TaroKit brand assets (app icons, maskable icon, preview image 1200 × 630, favicon) | n/a | Install icons and link previews | runtime (asset) | Owner's own work. Provenance: created for TaroKit by the Owner or generated from the Night Market tokens; source files kept in `assets/brand/` | approved | ADR-0004 |

## Testing and quality

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-18** | vitest | ^5.0 | Unit and integration tests | dev | MIT | approved | ADR-0006 |
| **DEP-19** | @playwright/test | ^1.64 | E2E on Chromium, Gecko and WebKit; perf marks | dev | Apache-2.0 | approved | ADR-0006 |
| **DEP-20** | @axe-core/playwright (pulls axe-core) | ^4.13 | Automated accessibility audit | dev | MPL-2.0 (dev-only exception) | approved | ADR-0006, ADR-0008 |
| **DEP-21** | @lhci/cli | ^0.15 | Lighthouse budgets for NFR-01 and NFR-11 | dev | Apache-2.0 | approved | ADR-0006 |
| **DEP-22** | eslint | ^10 | Linting | dev | MIT | approved | ADR-0006 |
| **DEP-23** | typescript-eslint | ^8.71 | TS lint rules | dev | MIT | approved | ADR-0006 |
| **DEP-24** | eslint-plugin-astro | ^3.2 | Lint `.astro` files | dev | MIT | approved | ADR-0006 |
| **DEP-25** | eslint-plugin-jsx-a11y | ^6.10 | Accessibility lint for islands | dev | MIT | approved | ADR-0006 |
| **DEP-26** | prettier | ^3.9 | Formatting | dev | MIT | approved | ADR-0006 |
| **DEP-27** | prettier-plugin-astro | ^1.1 | Format `.astro` files | dev | MIT | approved | ADR-0006 |

## Delivery

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-28** | wrangler | ^4 | Deploy static assets to Cloudflare | dev / ci | MIT OR Apache-2.0 | approved | ADR-0007 |
| **DEP-29** | GitHub Actions: actions/checkout, actions/setup-node, pnpm/action-setup, actions/cache | pinned by commit SHA | CI | ci | MIT | approved | ADR-0007 |

## Notable transitive dependencies (policy exceptions to watch)

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-30** | lightningcss (via vite) | transitive | CSS transforms in Vite 8 | build | MPL-2.0 (build-only exception) | approved | ADR-0008 |
| **DEP-32** | caniuse-lite (via browserslist) | transitive | Browser target data | build | CC-BY-4.0 (attribution in notices) | approved | ADR-0008 |

## Rejected (for the record)

| Package | Why |
|---|---|
| @vite-pwa/astro | Declared peer range stops at Astro 5 (ADR-0004). Revisit when it supports Astro 7. |
| tailwindcss | Duplicates tokens, not needed (ADR-0003) |
| fuse.js | Fuzzy scoring conflicts with the deterministic RULE-05 ranking (MOD-Search) |
| zod / valibot | Would restate the domain schema (ADR-0005) |
| any IT-Tools code | GPL-3.0 (ADR-0008) |

## Added after license audit 1 (2026-10-13)

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-33** | @fontsource-variable/unbounded | ^5 | Display face, self-hosted (style.md) | runtime (asset) | OFL-1.1 (text in notices) | approved | D-019 |
| **DEP-34** | @fontsource-variable/manrope | ^5 | Body face, self-hosted | runtime (asset) | OFL-1.1 (text in notices) | approved | D-019 |
| **DEP-35** | @fontsource-variable/jetbrains-mono | ^5 | Mono face, self-hosted | runtime (asset) | OFL-1.1 (text in notices) | approved | D-019 |
| **DEP-36** | @preact/signals-core | transitive of DEP-04 | Signals runtime | runtime | MIT (notice) | approved | ADR-0002 |
| **DEP-37** | fast-uri | transitive of DEP-08 | URI parsing in Ajv (build only, unless Ajv ships) | build | BSD-3-Clause | approved | ADR-0005 |
| **DEP-38** | Playwright browser binaries (Chromium, Firefox, WebKit) | via DEP-19 | E2E engines | dev | Chromium BSD; Firefox MPL-2.0; WebKit LGPL-2.1 (test-only, D-023) | approved | ADR-0006 |
| **DEP-39** | workerd | via DEP-28 | Local Workers runtime for preview | dev | Apache-2.0 | approved | ADR-0007 |
| **DEP-40** | pnpm | 11.x | Package manager | dev | MIT | approved | ADR-0002 |

Note (SP-6): DEP-33 to DEP-35 are source fonts only. The shipped files are fonttools subsets made at build (ADR-0003); fonttools is a build tool under the MIT license, to be registered when the build is scaffolded.

## Added when the build was scaffolded (2026-10-13)

| ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
|---|---|---|---|---|---|---|---|
| **DEP-41** | @types/node | ^24 | Node type definitions for build scripts, the content loader and tests (`astro check`) | dev | MIT | approved | ADR-0002 |
| **DEP-42** | fonttools (Python, `requirements-build.txt`) | 4.66.x | Build-time font subsetting (`scripts/subset-fonts.py`) and the link-preview image's glyph outlines (`scripts/preview-glyphs.py`) | build | MIT | approved | ADR-0003 |
| **DEP-43** | brotli (Python, `requirements-build.txt`) | 1.2.x | WOFF2 compression for fonttools | build | MIT | approved | ADR-0003 |
| **DEP-44** | Lucide icons copied into `content/assets/icons/` (category icons) | from DEP-15 | Bundled category icons (ENT-Category) | runtime (asset) | ISC (notice via DEP-15) | approved | ADR-0003 |
