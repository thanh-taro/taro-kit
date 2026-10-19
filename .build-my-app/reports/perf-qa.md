# Performance and quality NFR measurements (QA phase 5)

Build: `dist/` at main 6620240, production build served by `astro preview --port 4391` (stopped afterwards).
Rig: Playwright 1.64 with CDP. Chromium 156 (headless, macOS), WebKit 27.2. Firefox cannot launch here.
Lighthouse is not installed locally and was not installed. Mobile profile (reference-environment.md): 412x915, 4x CPU slowdown (`Emulation.setCPUThrottlingRate`), 9 Mbps down / 1.5 Mbps up / 170 ms RTT (`Network.emulateNetworkConditions`). Desktop: 1440x900, unthrottled.
Caveat: the preview server is local and uncompressed; the embedded tool's third-party iframe host was blocked (not portal weight). Host CPU is faster than a real mid-range phone, so 4x slowdown is an approximation.

## Summary

| NFR | Result | Value vs target | Confidence |
|---|---|---|---|
| NFR-01 first view | PASS | cold FCP/LCP 0.45-0.62 s vs 1.5 s; warm 0.05-0.07 s vs 0.5 s | Medium (lab proxy; see notes) |
| NFR-02 instant search | PASS (one outlier flagged) | palette open p50 ~22-26 ms vs 100; keystroke p95 37-39 ms (palette), 23-29 ms (catalog) vs 50 | Medium |
| NFR-06 offline | PASS now; RISK at 500 tools | all 13 URLs load offline, Chromium and WebKit; precache 69 entries, 802 KB | High now; projection medium |
| NFR-10 browsers | PARTIAL | Chromium and WebKit pass smoke; Firefox, real devices manual | n/a |
| NFR-11 lightweight | PASS | home ~96 KB brotli (all eagerly referenced assets) vs 200 KB; vs 170 KB architecture budget | High |
| NFR-12 shareable | PASS | titles <= 38, descriptions <= 80, og:image 1200x630 on all 15 pages | High |
| CLS | PASS | 0 on mobile; <= 0.0008 on desktop (home, tool view) vs 0.1 | High |

## NFR-01 Fast first view
Method: median of 5 runs per page and state, new context per cold run; warm = service worker installed and precache complete (69 entries), then reload, throttling still on. Metrics from PerformanceObserver (FCP, LCP).

| Page | Cold FCP | Cold LCP | Cold load event | Warm FCP | Warm LCP |
|---|---|---|---|---|---|
| Home | 608 ms | 620 ms | 1380 ms | 56 ms | 64 ms |
| Catalog | 492 | 492 | 1321 | 72 | 72 |
| Tool view | 452 | 452 | 1172 | 48 | 48 |
| About | 456 | 456 | 1161 | 52 | 52 |

Desktop (unthrottled): FCP/LCP 28-56 ms on all pages, cold and warm.
Notes: the spec criterion is "greeting and search entry rendered and responding". Greeting and search render at FCP (0.6 s). The search entry responds through the inline palette bootstrap before hydration; I could not time that pre-hydration response directly with a trusted key event. Full palette readiness (island hydrated and catalog data fetched, `.tk-palette[data-ready]`) is 1.56-2.05 s cold on mobile (median 1.63 s), over 1.5 s. That is not the stated criterion, but if the bootstrap does not cover the search click path it would matter. Treat as the main residual risk; confirm on a real phone (manual item 1).

## NFR-02 Instant search
Method: 500 generated catalog entries injected by routing `data/catalog.*.json`. Mobile profile (4x CPU). ~51-53 keystrokes per surface (10 queries typed char by char, real key events). Latency = `input` event to the next paint after the DOM mutation (rAF plus task).

| Measure (mobile) | p50 | p95 | max |
|---|---|---|---|
| Palette open (Mod+K to dialog painted, n=10) | 21-26 ms | n/a | 63-91 ms |
| Palette keystroke, JS only | 5 ms | 11 ms | 20 ms |
| Palette keystroke, to paint | 17-18 ms | 37-39 ms | 180-236 ms |
| Catalog keystroke, JS only | 2.5 ms | 10.5 ms | 13 ms |
| Catalog keystroke, to paint | 10-13 ms | 23-29 ms | 26-33 ms |

Desktop: palette open p50 23 ms; keystroke to paint p50 4 ms, p95 10 ms (palette); 2.6 / 6.3 ms (catalog).
Outlier: in 3 of 3 mobile runs, one palette keystroke (first character "c" of the query "color tool", typed after clearing) took 180-236 ms to paint, with only ~12 ms of JS. It is 1 of 53 samples (p95 is unaffected) but reproducible, so it is worth a Performance trace (likely style/layout of the re-rendered list or the aria-live update, not ranking). Not a fail against p95; flagged.

## NFR-06 Works offline
Method: install the service worker, wait for precache, reload, go offline (`setOffline`), visit every page type; repeated on Chromium and WebKit.
- Loaded offline with correct titles: `/`, `/tools/`, the 4 category pages, `/projects/`, `/about/`, `/now/`, `/settings/`, `/t/sample-dev/`, `/t/sample-media/`; an unknown URL gives the 404 page; the catalog search finds its data offline (`data-ready`). No page errors.
- Precache: 69 entries, 802,118 bytes stored (783 KiB), all of `dist/` except sw.js and _headers. (The 720 KB raw / 229 KB gzip figure from the brief was not reproduced exactly; `dist/` is 925 KB over 75 files including sw.js.) It is well under the 5 MB SP-4 bar.
- Risk at scale: every tool page is nearly identical (153 differing chars) and 34.5 KB raw (7.5 KB brotli), because each carries ~9 KB of inline scripts, ~2.8 KB inline SVG, ~2 KB meta and shell markup. The Cache API stores decoded bytes, so 500 tools is about 17-18 MB in the cache, above the SP-4 bar of 5 MB (the spike's fixture pages were ~3 KB each: 1.69 MB for 509 pages). This is a projection, not a measurement, and the portal has 4 tools today. Fix proposal when the catalog grows: stop precaching `t/*/index.html` per tool and serve one tool shell from a Workbox navigation fallback (ADR-0004 fallback), or shrink the per-page HTML (move the inline scripts to hashed files). Relevant code: `src/modules/offline/precache.ts` (entry list) and `scripts/build-sw.ts`.

## NFR-10 Supported browsers
Checked: Chromium 156 and WebKit 27.2, desktop 1440 and mobile 390 widths: 7 page types load with no console or page errors, no horizontal scroll, palette opens by shortcut on `/` and `/tools/`. Offline and service worker pass on both. The repo's e2e config already defines chromium, firefox and webkit projects (not re-run here, to avoid building the fixtures).
Not checkable here: Firefox (two latest majors), real Safari/iOS, Chrome on Android, the previous major version of each engine. See manual items.

## NFR-11 Lightweight
Method: brotli -q11 of each file reachable from each page (HTML, linked CSS, all JS modules reachable by static import including island code and the palette, fonts counted at WOFF2 size since already compressed). This overcounts the first visit, because some islands load later.

| Page | HTML | JS | CSS | Fonts | Total |
|---|---|---|---|---|---|
| Home | 10.3 KB | 26.2 KB | 6.4 KB | 50.5 KB | 93.4 KB |
| Catalog | 8.6 KB | 25.7 KB | 5.9 KB | 50.5 KB | 90.8 KB |
| Tool view | 7.3 KB | 24.8 KB | 5.1 KB | 50.5 KB | 87.7 KB |
| About | 7.0 KB | 23.3 KB | 6.2 KB | 50.5 KB | 87.0 KB |

(Sizes in KiB, rounded from byte counts: home 10,552 / 26,793 / 6,537 / 51,736 B = 95,618 B.) Add catalog data 0.5 KB, manifest 0.2 KB (about 96 KB total for home). Avatar is excluded.
Budgets (architecture.md): HTML 10.3 vs <= 20 pass; CSS 6.4 vs <= 15 pass; JS 26.2 vs <= 39 (12 runtime + 15 islands + 12 palette) pass; fonts 50.5 vs <= 80 pass (5 WOFF2 files: Manrope latin and Vietnamese, Unbounded 600 latin and Vietnamese, JetBrains Mono ascii; the budget says at most 2 subsets, so the file count differs from the table's wording); total vs 170 KB pass, vs NFR-11 200 KB pass. Measured transfer on the preview server was 97 KB for home cold.

## NFR-12 Shareable
Read directly from `dist/`: all 15 pages declare title (max 38 chars), description (max 80 chars), 9 og tags and twitter:card; og:image is `https://tarokit.app/preview.png`, a 1200 x 630 PNG (69 KB). The e2e spec `tests/e2e/link-previews.spec.ts` asserts the same limits.

## Layout stability (CLS)
5 cold runs per page, 2.5 s observation: mobile profile 0 on home, catalog, tool view and about. Desktop 0.0001 (home), 0.0008 (catalog), 0 (tool view). Target < 0.1.

## Fixes
No failures. Suggestions, in priority order:
1. Precache growth (`src/modules/offline/precache.ts`, `scripts/build-sw.ts`): per-tool pages are 34.5 KB raw each; at 500 tools the cache would be about 17 MB vs the 5 MB bar. Decide before the catalog grows (see NFR-06).
2. Palette first-use paint outlier (~200 ms, `src/modules/palette/Palette.tsx` render of the results list): trace it on a device.
3. Palette full readiness 1.6 s cold on mobile profile; if it matters, it is the catalog fetch after hydration (`Palette.tsx:106`), start the fetch from the bootstrap.

## Manual checklist (real devices, user to run)
1. Real phone over real 4G, first visit: open the deployed URL in a fresh private tab with remote debugging (chrome://inspect for Android Chrome, Safari Web Inspector for iOS). Record FCP/LCP in the Performance panel or Lighthouse mobile run; target greeting and search usable within 1.5 s. Tap the search entry immediately after first paint and note whether it opens before hydration finishes.
2. Repeat visit and installed app: install (Add to Home Screen / Install), close it, switch on airplane mode, relaunch; expect the shell in under 0.5 s and every page including `/tools/` search working. Check iOS storage isolation of the installed app (F-003.R8 risk).
3. Browsers: run the e2e suite with `pnpm exec playwright test --project=firefox` on a machine where Firefox launches; smoke the previous major version of Chrome, Firefox and Safari (desktop) and iOS Safari and Chrome Android.
4. Palette on a real phone: type 10 characters fast into the catalog search and the palette with a 500-entry catalog; no visible lag or dropped characters.
5. NFR-09 and NFR-03 screen-reader passes remain manual and are out of scope here.
