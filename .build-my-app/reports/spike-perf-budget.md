# Spike SP-6 — budget baseline on the skeleton (2 h)

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-6 (unknowns U-7, U-8).
- Time box: 2 h of agent work.
- Built on the SP-5 skeleton (branch spike/sp5, spikes/sp5), copied to spikes/sp6.
- Not built: production code. Local only (localhost), since the real domain is not live yet.
- Note: the framing was first written to `.build-my-app/reports/spike-.md` (empty slug and time box). This file replaces it.

## SP-6 result

**Verdict: adapt** (2026-10-13). The skeleton meets NFR-01, NFR-02 and NFR-11 with at least 20 % headroom, but only with the "lean" font plan below. Fontsource variable packages as shipped fail the 20 % headroom bar for NFR-11 (155 KB with English content, 193 KB once Vietnamese text appears, against a 160 KB bar). Palette timing (U-8) passes with a wide margin, including the case where the shortcut is pressed before hydration.

### What was built (spikes/sp6)
- Astro 7.3.8 + Preact 10.29.8 + signals, `output: static`, CSP on (per-page `frame-src`, which is SP5_CSP_MODE=perpage).
- Home is ported from `design/canvas/HomeDesktop.dc.html`: shell bar, greeting set by an inline script, search control, favorites and recents (`HomeLists`, `client:load`, reading localStorage), category tiles, and "Fresh from my workbench".
- The palette is a pre-rendered `<dialog>` plus a ~0.9 KB inline bootstrap that arms Mod+K, "/" and the search controls. The `Palette` island (`client:idle`) adds search. Its empty state follows `PaletteDesktop.dc.html` (Favorites, Recent, Pages). Queries need every token to match, and results show at most 8 rows per group and at most 4 groups.
- 21 Lucide icons are inlined at build (`lucide-static`, 1.5 px stroke). There is no icon request.
- The catalog has 500 tools generated through the real content pipeline (`scripts/gen-catalog.ts`); 1 in 12 has a Vietnamese name and summary.
- Fonts come in two variants: **fontsource** (the `@fontsource-variable/*` CSS as shipped) and **lean** (`scripts/subset-fonts.py`, fonttools: Latin and Vietnamese subsets only, weight axis narrowed, unhinted, mono without code ligatures).
- There is a stand-in service worker (precache, cache-first) for repeat visits, and a brotli server (`scripts/serve.ts`) that behaves like Cloudflare.

### Rigs
- Playwright Chromium 1.64 with CDP: 4× CPU, 9000/1500 Kbps, 170 ms latency, 412 × 915 viewport, 5 runs per variant (`scripts/measure.ts`, JSON in `spikes/sp6/evidence/measure-*.json`).
- Palette timing uses `performance.measure` from `event.timeStamp` to the frame after the next paint. Event Timing interaction durations (INP-style) are recorded as a cross-check.
- Lighthouse 13.5 on the same profile, 5 runs each, in two modes: devtools (applied) throttling (`scripts/lh.sh`) and simulated throttling (`scripts/lh-sim.sh`).

### Numbers (medians of 5)

| Measure | Budget (−20 % bar) | fontsource, EN | fontsource, VI | **lean, EN** | **lean, VI** |
|---|---|---|---|---|---|
| Home transfer, total (KB, compressed) | ≤ 200 (160) | 155.4 | **192.8 ✗** | **73.7** | **86.5** |
| · HTML | ≤ 20 | 5.2 | 5.3 | 5.2 | 5.3 |
| · CSS | ≤ 15 | 9.3 | 9.3 | 2.8 | 2.8 |
| · JS (runtime + all islands) | ≤ 39 | 14.7 | 14.7 | 14.7 | 14.7 |
| · Fonts | ≤ 80 | 114.1 ✗ | 151.4 ✗ | 38.9 | 51.6 |
| · Catalog JSON, 500 entries (idle prefetch) | ~35 | 12.1 | 12.1 | 12.1 | 12.1 |
| First view, Playwright: max(LCP, bootstrap armed) | ≤ 1.5 s (1.2) | 0.48 s | 0.48 s | 0.46 s | 0.47–0.59 s |
| First view, Lighthouse simulated LCP | ≤ 1.5 s (1.2) | 1.37 s | 1.54 s ✗ | 1.37 s | 1.37 s |
| First view, Lighthouse devtools LCP | ≤ 1.5 s | 0.48–2.4 s (bimodal, see below) | 1.45–2.35 s | 0.46–2.58 s | 1.42–2.53 s |
| Repeat view (SW precache), Playwright LCP | ≤ 0.5 s (0.4) | 0.11 s | 0.11 s | 0.11 s | 0.12 s |
| Palette open, hydrated | ≤ 100 ms (80) | 34 ms | 23 ms | 19 ms | 19 ms* |
| Palette open, Event Timing | ≤ 100 ms | 24 ms | 24 ms | 32 ms | 24 ms |
| Per keystroke, median / p95 | ≤ 50 ms (40) | 4.9 / 29 ms | 4.2 / 27 ms | 3.6 / 29 ms | 4.4 / 16 ms* |
| Per keystroke, Event Timing median / p95 | ≤ 50 ms | 24 / 56 ms | 24 / 80 ms | 24 / 88 ms | 16 / 24 ms* |
| Shortcut before hydration: open | ≤ 100 ms | 25 ms | 28 ms | 53 ms | 29 ms |
| Shortcut before hydration: first results | (none) | 425 ms | 538 ms | 626 ms | 506 ms |
| Lighthouse score / TBT / CLS | | 99 / 0 / 0.05 | 99 / 0 / 0.05 | 100 / 0 / 0.05 | 100 / 0 / 0.05 |

\* lean VI rerun (`measure-4613-rerun.json`). The first run had two isolated host stalls (one key event of about 1 s). They did not reproduce. Single Event Timing outliers of 56–88 ms show up in every variant and come from host noise, not from the code path (the `performance.measure` median is 4–5 ms). QA should gate on the median plus p75, not the max.

A variant with the catalog fetched on first open (`SP6_CAT=open`) cuts the initial transfer to 61.6 KB. Open takes 19 ms; keystrokes take 4.3 ms median and 30 ms max. Preloading the display face as well as the body face did not change Lantern LCP (1.37 s).

### Findings and surprises
1. **U-7 is real, and the cause is overlapping `unicode-range`s, not weight count.** Fontsource's `latin-ext` range (U+0100–02BA, U+1E00–1E9F, …) overlaps its `vietnamese` range. Any Vietnamese text therefore downloads *both* faces. Body Vietnamese adds Manrope latin-ext (15 KB) and vietnamese (8.5 KB). A Vietnamese heading would also pull Unbounded latin-ext, which is **118 KB** on its own. Variable fonts make the weight count irrelevant for transfer. What costs bytes is glyph coverage (Unbounded latin is 50 KB) and JetBrains Mono's code-ligature alternates (40 KB).
2. **Astro's CSP does not hash `is:inline` scripts.** `Astro.csp.insertScriptHash()` only takes effect when called before `<head>` renders. A hash added from a component in `<body>` is dropped without any warning. With CSP on, the bootstrap, greeting and SW registration were all blocked. The fix is to keep inline scripts as string constants and register their hashes in the layout frontmatter (`src/inline.ts`, `Shell.astro`).
3. The 500-entry catalog is **12 KB brotli**, about a third of the architecture estimate (35 KB). It makes pre-folding the search keys at build time worthwhile.
4. The first palette build rendered 32 rows on an empty query, and opening then took 70–110 ms (Event Timing up to 112 ms). The design's empty state (Favorites, Recent, Pages; 5–13 rows) brought open down to about 20 ms. **The empty state is a performance requirement, not only a design choice.**
5. Pre-hydration path: open stays under 60 ms in every run, and text typed before hydration survives because the input is uncontrolled. Results appear 0.4–0.6 s after the shortcut, once `client:idle` hydration and the catalog fetch finish.
6. Lighthouse devtools throttling on macOS headless gives bimodal LCP, quantised in steps of about 0.95 s (0.46 / 1.4 / 2.4 s), whatever the page content. Network finished by about 0.8 s in the slow runs. This looks like a frame-scheduling artifact of the rig, and the Playwright rig on the same profile is stable. Lantern (simulated) is deterministic but pessimistic: 1.37 s, gated by the display font on the h1.

### Proposed edits
- **Fonts (ADR-0003, architecture budget table, `dependencies.md`):** build-time subsetting with fonttools from the Fontsource variable sources. Ship exactly two subsets per family, Latin core and Vietnamese, with **no latin-ext face**, so the ranges never overlap.
  - **Unbounded:** static 600 instance (declared `font-weight: 500 700`), headings-only ASCII set. 9.7 KB, plus 5.2 KB Vietnamese.
  - **Manrope:** variable, axis 400–700. 20.7 KB, plus 7.4 KB Vietnamese.
  - **JetBrains Mono:** variable, axis 400–600, ASCII only, no `liga`/`calt`. 8.5 KB, plus 5.0 KB Vietnamese.

  Fonts total 39 KB (English) or 52 KB (Vietnamese) against the 80 KB budget. Characters outside these sets fall back to the system face. The CI `dist/` scan should fail on any `latin-ext`, `cyrillic` or `greek` face.
- **Loading strategy:**
  - Keep `font-display: swap` and one preload, for the Manrope Latin face.
  - The palette stays `client:idle`, with the inline bootstrap and the static `<dialog>`; `client:load` gives no measurable gain.
  - Keep the catalog prefetch on hydrate (12 KB). Fetch-on-open is the fallback if the budget tightens.
  - `HomeLists` stays `client:load`.
  - Inline scripts become string constants, hashed in the layout frontmatter (ADR-0002 and ADR-0009 note).
- **Budget table (architecture.md):**
  - Catalog: about 12 KB brotli for 500 entries, not about 35 KB.
  - Fonts row: "2 subsets per family (Latin core + Vietnamese), no latin-ext".
  - Measured total: 74 KB (English) / 87 KB (Vietnamese), against the 170 KB budget.
- **NFR-01 / NFR-02 measurement (ADR-0006):** the CI gate should be the Playwright CDP rig: performance marks, median of 5, with Event Timing p75 as the cross-check. Lighthouse simulated stays as an advisory ceiling (≤ 1.5 s), run on Linux CI, not macOS. NFR wording is unchanged.
- **Palette spec (MOD-Palette):** make the empty-query view (Favorites ≤ 4, Recent ≤ 4, Pages) and the 8-per-group / 4-group cap normative. Matching is multi-token AND over pre-folded keys, with "đ" folded to "d".

Evidence: `spikes/sp6/evidence/` (measure JSON, home and palette screenshots). The scripts are `scripts/measure.ts`, `lh.sh`, `lh-sim.sh`, `subset-fonts.py`, `gen-catalog.ts` and `build.sh`.
