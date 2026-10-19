# License audit 2 (2026-10-19)

Not legal advice. Inputs: dependencies.md, ADR-0008, package.json, requirements-build.txt, built dist/ (main at 6620240), `pnpm licenses:check` (747 packages, 6 registered exceptions, as reported). Audit 1 gaps G1, G3 (signals-core, fast-uri, workerd, pnpm, Playwright browsers) and G4 (brand assets exist now) are closed in the registry.

## Registry vs installed
All direct deps in package.json (17 runtime, 15 dev) and both Python packages map to approved rows with correct scope: DEP-11 workbox-build (dev in package.json, build in registry: consistent), DEP-12/13, DEP-31 sharp direct, DEP-33-35 fonts, DEP-42/43 fonttools and brotli (MIT). No `candidate`, `personal-only` or unclear entries; none in release config.

## What ships in dist/
Preact, @preact/signals and signals-core, ajv/ajv-formats are MIT (ajv/fast-uri not found in the built JS, so no notice needed); Workbox 7.4 runtime in sw.js (MIT); Astro island runtime (MIT); 5 font subsets (OFL); 3 PNG icons and preview.png (own work, generated from tokens and Unbounded outlines); inlined Lucide SVGs (ISC, Feather MIT). Nothing LGPL/GPL/MPL/CC-BY-SA in output. lightningcss, sharp, libvips, caniuse-lite strings are absent from dist/.

Notices file (1000+ lines) lists every shipped runtime item with full license text: MIT/ISC, Feather MIT (Cole Bemis), CC-BY-4.0 for caniuse-lite, three OFL texts with copyright lines.

Fonts: the Unbounded, Manrope and JetBrains Mono copyright lines declare no Reserved Font Name, so subsetting (fonttools, 5 faces) needs no renaming. OFL clause 3 is not triggered.

Test assets: tests/fixtures PNGs are not in dist/; check-dist-clean passes on markers.

## Findings
- Minor 1: /third-party-notices.txt is not linked from any page (ADR says not in main nav). Reachable only by URL. Add a footer or About link, or accept as policy. Also cited in policy for caniuse-lite attribution (build-only, so no duty).
- Minor 2: DEP-17 says brand sources (favicon, preview) are in assets/brand/, but only the two app-icon SVGs exist; preview.png is generated and no favicon source is present. Update the row to describe the generated preview and the real favicon.
- Minor 3: The brand mark embeds an Unbounded "T" outline (OFL permits; noted in the SVG). Register the dependency on DEP-33 in DEP-17.
- Minor 4: dependencies.md `status: draft` and the registry carries DEP-30 "per D-023" rows; set to ready/approved. Sample tools/project (`sample-*`) pages ship in dist/t; not a license problem, but confirm they are intended for release.
- Minor 5: Workbox/Preact bundles carry no license banners; covered by notices, so acceptable.

No blockers, no majors. Legal review: not needed.

## Verdict
Release license-clean: APPROVED, subject to the minor registry/doc fixes above.
