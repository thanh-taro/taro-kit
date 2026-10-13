# License audit 1 (2026-10-13)

Not legal advice. Licenses were checked against the npm registry (`npm view <pkg> license`) and, for Lucide, the published LICENSE file (https://unpkg.com/lucide-static@1.55.0/LICENSE). Font licenses were checked via https://api.fontsource.org/v1/fonts/<id>. No package.json, lockfile or asset folder exists yet, so nothing installed or bundled could be inspected, and no personal-only items exist in any release config.

Policy basis: ADR-0008 plus D-023 (build/test-only MPL-2.0 and LGPL binaries allowed, never shipped to visitors).

## Per-entry verdicts

| DEP | Name | Verified license | Scope | Verdict |
|---|---|---|---|---|
| 01 | astro 7.3.8 | MIT | build + small runtime | approve |
| 02 | @astrojs/preact 6.0.6 | MIT | build | approve |
| 03 | preact (10.29.x; latest is 11.0.1) | MIT | runtime | approve |
| 04 | @preact/signals 2.11.3 | MIT (dep @preact/signals-core, MIT) | runtime | approve |
| 05 | typescript (pinned ~6.0; latest 7.0.2) | Apache-2.0 | dev | approve |
| 06 | @astrojs/check | MIT | dev | approve |
| 07 | yaml | ISC | build | approve |
| 08 | ajv 8.20 | MIT | build + standalone output shipped | approve (see N3) |
| 09 | ajv-formats | MIT | build + shipped in validator | approve |
| 10 | json-schema-to-typescript | MIT | dev | approve |
| 11 | workbox-build | MIT | build | approve (transitive tree not checked) |
| 12 | workbox-precaching/routing/strategies/core 7.4.1 | MIT; only inter-deps are workbox-* | runtime in sw.js | approve |
| 13 | workbox-window 7.4.1 | MIT (deps: workbox-core MIT, @types/trusted-types MIT, types only) | runtime | approve |
| 14 | style-dictionary | Apache-2.0 | dev | approve |
| 15 | lucide-static 1.55.0 | ISC, plus MIT for Feather-derived icons | runtime asset | approve, with notice duty (N4) |
| 16 | "UI typeface" (generic) | OFL-1.1 for all three candidates | runtime asset | unclear as written (G1); the fonts themselves approve |
| 17 | Brand assets | "Owner's own work" | runtime asset | unclear: no files, provenance unverified |
| 18 | vitest | MIT | dev | approve |
| 19 | @playwright/test | Apache-2.0 | dev | approve |
| 20 | @axe-core/playwright 4.13 (axe-core 4.14) | MPL-2.0, both | dev | approve-build-only (D-023) |
| 21 | @lhci/cli | Apache-2.0 | dev | approve (transitive tree not checked) |
| 22-27 | eslint, typescript-eslint, eslint-plugin-astro, eslint-plugin-jsx-a11y, prettier, prettier-plugin-astro | MIT | dev | approve |
| 28 | wrangler | MIT OR Apache-2.0 | dev/ci | approve |
| 29 | GitHub Actions (checkout, setup-node, pnpm/action-setup, cache) | MIT per registry; not independently verified | ci | approve, unverified |
| 30 | lightningcss 1.33.0 | MPL-2.0 | build | approve-build-only |
| 31 | sharp 0.35.5 + @img/sharp-libvips | sharp and @img/sharp-<platform> are Apache-2.0; libvips is LGPL-3.0-or-later | build | approve-build-only |
| 32 | caniuse-lite | CC-BY-4.0 | build | approve-build-only (attribution in notices) |

Fonts requested in this audit (not individually registered; see G1):

| Font | Package | License | Verdict |
|---|---|---|---|
| Unbounded (Latin, Latin-ext, Vietnamese subsets exist) | @fontsource-variable/unbounded 5.3.0 | OFL-1.1 | approve |
| Manrope (all three subsets exist) | @fontsource-variable/manrope 5.3.0 | OFL-1.1 | approve |
| JetBrains Mono (all three subsets exist) | @fontsource-variable/jetbrains-mono 5.3.0 | OFL-1.1 | approve |

No reject verdicts. The rejected list is consistent with the policy.

## Shipped-to-browser check

Nothing shipped is non-permissive. The shipped set is:
- preact, @preact/signals, @preact/signals-core, workbox-window, workbox-core, workbox-precaching, workbox-routing, workbox-strategies: all MIT.
- The ajv standalone runtime helpers: MIT, plus fast-uri (BSD-3-Clause) if the `uri` format compiles in.
- The Astro island runtime: MIT.
- Lucide SVGs: ISC/MIT.
- The three OFL fonts.

The MPL-2.0 (lightningcss, axe-core) and LGPL (libvips) items are build/test only. Compiled CSS output is not covered by MPL.

## Gaps and blockers

- G1 (registry gap, fix before install): DEP-16 is a placeholder ("e.g. inter"). The style spec (specs/30-experience/style.md, tokens.json) fixes Unbounded, Manrope and JetBrains Mono. Register three rows (suggested: @fontsource-variable/unbounded, @fontsource-variable/manrope, @fontsource-variable/jetbrains-mono, OFL-1.1, runtime asset). ADR-0008 requires registry-first.
- G2 (policy and CI conflict, blocker for the CI gate design): ADR-0008 says runtime scope comes from `pnpm licenses list --prod`. astro is a normal dependency, so lightningcss (via vite), sharp, libvips and caniuse-lite will appear in the prod tree and fail the check, even though they are not shipped. The check needs a per-package allowlist for DEP-30/31/32 (D-023), or it should audit `dist/` content (fonts, JS bundles, sw.js) instead. Define this before wiring CI.
- G3 (unregistered items the ADRs imply):
  - workerd (named in ADR-0008 as a build-script package) and pnpm itself.
  - @preact/signals-core, a runtime transitive that is MIT but absent from the registry and must be in the notices file.
  - fast-uri (BSD-3-Clause), reachable in the shipped standalone validator and needing its notice there.
  - The Playwright browser binaries (Chromium, Firefox, WebKit) are dev-only. Firefox is MPL and WebKit is LGPL, which falls under D-023 test-only, but they are unregistered.
  - @fontsource packages and the Renovate/Dependabot choice.
- G4 (unclear): DEP-17 brand assets have no files and no provenance record. Keep it unapproved until the files exist and the Owner confirms authorship. Raster or AI-generated sources need a note.
- G5: .build-my-app/reports/style-directions.html loads Unbounded, Manrope and JetBrains Mono from the Google Fonts CDN. This is a prototype only. Make sure it never ships and that the real site self-hosts (NFR-05).

## Obligations (notices file)

- N1: `/third-party-notices.txt` must carry the MIT/ISC/BSD copyright notices for preact, signals, workbox, ajv, fast-uri, Astro runtime and Lucide.
- N2: Include the OFL-1.1 text and each font's copyright line. Do not sell the fonts standalone. Fontsource's unicode-range subsets are normally fine, but Reserved Font Name handling should be checked if the team re-subsets or modifies the files (legal review if modified).
- N3: Check that the generated ajv standalone file keeps its license headers.
- N4: Lucide: the Feather-derived icon list carries a separate MIT notice (Cole Bemis). Include both notices if any of those icons (check, chevrons, search, x, etc.) are used.
- N5: caniuse-lite CC-BY-4.0: attribution in the notices file, as ADR-0008 states.

## Unverified / needs follow-up

- Full transitive trees of workbox-build, @lhci/cli (Lighthouse), wrangler/workerd, and Playwright are not enumerated. Run `pnpm licenses list --json` after the first install.
- GitHub Actions licenses are taken from the registry, not checked.
- Legal review is recommended only for font modification or re-subsetting, and for the brand-asset provenance if anything non-original is used.
- Version drift (informational): preact 11.0.1 and typescript 7.0.2 are the latest, but the registry pins 10.x and 6.0. Both are licensed identically to the pinned lines.
