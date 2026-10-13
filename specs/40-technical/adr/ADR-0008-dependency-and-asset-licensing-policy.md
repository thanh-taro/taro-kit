---
id: ADR-0008
title: Dependency and asset licensing policy
status: proposed
date: 2026-10-13
supersedes: []
---

## Context
TaroKit is a personal, public, MIT-friendly project. The Owner prefers permissive licenses (MIT, Apache, BSD, ISC, OFL). The market research warns that IT-Tools is GPL-3.0 and must not be copied. DevToys (MIT) and CyberChef (Apache-2.0) need attribution if anything is reused. Two facts force exceptions:
- Vite 8, which Astro depends on, depends on `lightningcss` (MPL-2.0).
- Astro depends on `sharp`, whose prebuilt binaries bundle libvips (LGPL-3.0-or-later).

The usual axe accessibility engine is also MPL-2.0. Browserslist data (`caniuse-lite`) is CC-BY-4.0. Fonts are usually OFL-1.1. The policy must be checkable by a machine in CI.

## Decision
- **Registry first.** Every direct dependency and every bundled asset pack is registered in `specs/40-technical/dependencies.md`, with its license, scope and status, before it is used. Status moves from `candidate` to `approved`, and later possibly to `removed`.
- **Allowed for anything, including code and assets shipped to browsers:** MIT, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, Apache-2.0, Unlicense, CC0-1.0, BlueOak-1.0.0, Python-2.0, and OFL-1.1 for fonts.
- **Allowed for build and dev tools only, used unmodified and not shipped to browsers:**
  - MPL-2.0 (`lightningcss`, `axe-core`);
  - LGPL-2.1 or LGPL-3.0 prebuilt binaries (`sharp`'s libvips);
  - CC-BY-4.0 data (`caniuse-lite`), with attribution in the notices file.
- **Never allowed:** GPL, AGPL, SSPL, BUSL or other source-available licenses, CC-BY-NC or ND, "no license", and unknown licenses. No code, styles, copy or icons are copied from IT-Tools. Ideas and UX patterns are fine.
- **Assets:**
  - Fonts must be OFL-1.1 or permissive, and are self-hosted (NFR-05).
  - Icons must be ISC or MIT (Lucide, or Tabler or Phosphor as alternates).
  - Images and preview images must be the Owner's own work, or CC0. CC-BY is allowed with attribution on the About page.
- **Enforcement:**
  - CI runs `pnpm licenses list --json` and fails on any license that is not on the allowed lists for its scope. Scope comes from the registry's Scope column, not from the production tree: astro is a production dependency, yet lightningcss, sharp, libvips and caniuse-lite never ship. Build-only packages are allowlisted by name (D-023). A second check scans `dist/` for third-party code and fonts, and fails on anything that is not in the registry with runtime scope.
  - The build emits `/third-party-notices.txt`, listing the licenses of shipped runtime code and assets, which satisfies MIT, ISC and BSD notice terms.
  - **Supply chain:** pnpm's default block on dependency lifecycle scripts stays on, and only approved packages may run build scripts (`sharp`, `workerd`). `minimumReleaseAge` delays brand-new releases by 3 days. The lockfile is committed, and Renovate or Dependabot updates are reviewed, not auto-merged.

## Alternatives considered
- **Strictly permissive everywhere.** It's impossible with any Vite-based stack (lightningcss), and it would exclude the standard accessibility engine.
- **No policy, ad-hoc review.** It drifts, and it can't be checked by agents generating code.
- **SPDX SBOM tooling** (for example CycloneDX). More than a personal site needs. `pnpm licenses` is built in and sufficient.

## Consequences
- Adding a dependency takes two steps: a row in `dependencies.md`, then the install. CI catches a forgotten row through the license audit only indirectly, so code review must check the registry.
- If a transitive runtime dependency ever turns up an MPL or LGPL license, the build fails, and a decision is needed before shipping.
- The notices file is public and small. It is not linked from the main navigation.
