---
title: Spike plan
status: draft
---

# Spike plan

Spikes are time-boxed experiments in the chosen stack: Astro 7 with Preact islands (ADR-0002), Workbox (ADR-0004), Ajv (ADR-0005), Cloudflare static assets (ADR-0007) and the iframe policy (ADR-0009). Spike code is throwaway. It lives in `spikes/` and is never merged into `src/`. What survives is a short result note appended to this file, a decision (accepting or amending an ADR), and any regression test worth keeping.

## Shared rigs
- **Lab domain:** `lab.tarokit.app` as the portal and `labtool.tarokit.app` as the tool (one level deep, so Cloudflare's free Universal SSL `*.tarokit.app` certificate covers both), both deployed as Cloudflare static-assets projects with `_headers`. Both are on the same registrable domain, so they are same-site but cross-origin, exactly as in ADR-0001. This needs the real domain (an open user decision).
  - **Desktop-only fallback until the domain exists:** `/etc/hosts` entries for `portal.test` and `tool.portal.test`, with locally trusted TLS certificates from mkcert, a dev tool that is not a dependency. Mobile engines can't be covered this way.
- **Skeleton:** a minimal Astro 7 + `@astrojs/preact` project with `output: "static"` and `security.csp` on. It is used by SP-4, SP-5 and SP-6.

Order: SP-5, then SP-4, then SP-6 (each builds on the skeleton). SP-2 can run any time. SP-1 and SP-3 share the lab rig and run as soon as the domain exists. Total box: 14 h.

---

## SP-1 — Same storage when embedded vs opened directly (3 h)
**Question.** Does an own tool on `tool.<site>` see the same localStorage (and IndexedDB and service worker) when it is embedded in the portal at `<site>` as when it is opened directly, in Chromium, Gecko and WebKit? This decides whether ADR-0001 is accepted, and whether F-003.AC11 can pass.

**Experiment.**
1. **Tool page** on `labtool.tarokit.app`. On load, it shows:
   - `localStorage["probe"]`;
   - an IndexedDB value;
   - a `SameSite=Lax` cookie;
   - `document.hasStorageAccess()`;
   - whether its own service worker is controlling.

   Buttons write a new timestamp to each store.
2. **Portal page** on `lab.tarokit.app`. It embeds the tool with the exact production attributes, `sandbox="allow-scripts allow-same-origin allow-forms"`, plus the production CSP `frame-src` and `_headers`.
3. **Steps per engine:**
   1. Open the tool directly and write A.
   2. Open the portal and check that the frame shows A.
   3. Write B in the frame.
   4. Open the tool directly and check that it shows B.
4. **Repeat with:**
   - Chrome with third-party cookies blocked;
   - Firefox with Enhanced Tracking Protection set to Strict;
   - Safari with default ITP;
   - a private window in each browser (expect isolation, and record it).
5. **Installed contexts:** Chrome installed PWA (desktop and Android), Safari "Add to Dock" (macOS) and "Add to Home Screen" (iOS). Write in the embedded frame inside the installed app, then use open-in-new-tab and read the value.
6. **Automation:** try the same flow in Playwright with `portal.localhost` and `tool.portal.localhost` on all three engines. Keep it as the F-003.AC11 regression test if the engines resolve `*.localhost`.

**Pass.** Steps 3.2 and 3.4 succeed in normal browser windows on Chrome, Edge, Firefox, Safari macOS and Safari iOS. Installed-context results are recorded either way.

**Expected risk.** iOS home-screen apps have their own storage container, so step 5 will probably differ on iOS. If so, propose scoping F-003.R8 to "within the same browser" (a spec change), and accept ADR-0001.

**If it fails in a normal window:** escalate. The fallback is same-origin path routing (ADR-0001 alternative), which couples deploys (PRN-01). That is a user decision.

## SP-2 — Embeddability classifier (2 h)
**Question.** Does the CI header check (MOD-CatalogCheck `classifyEmbedding` plus the redirect and timeout fetcher) classify embeddability and reachability exactly as browsers behave?

**Experiment.**
1. A Node 24 fixture server (`node:http`) on `tool.localhost` serves scripted routes.
   - **Good, so embeddable:**
     - g1: no headers;
     - g2: `frame-ancestors https://portal.localhost:PORT`;
     - g3: `X-Frame-Options: SAMEORIGIN` plus a CSP that allows the portal (CSP wins);
     - g4: a 3-hop redirect chain ending unrestricted;
     - g5: `Content-Security-Policy-Report-Only: frame-ancestors 'none'` only (ignored).
   - **Bad:**
     - b1: `X-Frame-Options: DENY`;
     - b2: `SAMEORIGIN` alone;
     - b3: `frame-ancestors 'self'`;
     - b4: two CSP headers, one allowing the portal and one `'none'`;
     - b5: `frame-ancestors https://*.portal.localhost`, which excludes the apex itself.
   - **Reachability:**
     - r1: 6 redirects;
     - r2: an 11 s delay (a timeout after one retry);
     - r3: 404;
     - r4: a 500 on the first try and a 200 on retry (pass).
2. **Ground truth:** a Playwright test on Chromium, Firefox and WebKit loads `portal.localhost` with one iframe per route. Each fixture page calls `parent.postMessage("rendered", "*")` on load, so "blocked" means no message within 3 s.
3. Run the classifier over the same routes and compare.
4. **Sanity run from GitHub Actions** against about 5 real public URLs (report only). This checks for bot-protection 403s and HEAD-versus-GET quirks.

**Pass.** 100 % agreement between the classifier and all three engines on the 10 embed fixtures (5 good, 5 bad), and correct reasons on r1 to r4. The pure classifier and fixtures become MOD-CatalogCheck's unit and integration tests.

**Watch.** `fetch` joins repeated CSP headers with `, `, so the classifier must split policies on commas. An invalid or duplicated XFO value is a warning, not a failure.

## SP-3 — Per-tool permissions in Chrome and Safari (2 h)
**Question.** With the ADR-0009 mapping, do clipboard-write, downloads and file-pick, plus clipboard-read, popups, fullscreen, camera and microphone, work when granted and fail when not, in Chrome and Safari (and, for the record, Firefox)?

**Experiment.**
1. **Capabilities page** on `labtool.tarokit.app`, with one button per capability:
   - `clipboard.writeText` and `readText`;
   - a Blob `<a download>`;
   - `<input type=file>`;
   - `window.open`;
   - `requestFullscreen`;
   - `getUserMedia` for video and for audio;
   - a same-origin form submit;
   - `alert()`, as a control, which should always be blocked.
2. **Portal page** on `lab.tarokit.app`. It renders one baseline iframe with no permissions, plus one iframe per single permission. Each iframe's attributes come from the `frameAttributesFor()` prototype, and the portal's `Permissions-Policy` comes from the `_headers` generator.
3. **Matrix:** Chrome desktop and Android, Safari macOS and iOS, and Firefox desktop, filled in by hand, recording granted and denied outcomes. Automate the Chromium column with Playwright as a regression test (F-003.AC3).

**Pass.** Every granted capability works in Chrome and Safari, and the baseline refuses clipboard-write in Chrome.

**Expected findings.**
- Safari and Firefox allow clipboard writes after a gesture without delegation.
- File inputs work without any permission everywhere.
- These results feed the RULE-10 wording change and the final ADR-0009 table.
- The run also decides whether `allow-forms` stays in the base token set.

## SP-4 — Installed portal offline (3 h)
**Question.** Does the installed PWA:
- open `/t/<id>/` offline;
- show the offline state for a tool that is not offline-capable;
- run an offline-capable embedded tool;
- show not-found for unknown ids;
- handle updates without auto-reloading?

**Experiment.**
1. **Skeleton** (after SP-5), with three fixture tools:
   - `offline-tool`: embedded and offline-capable, with its own SW on `labtool.tarokit.app`;
   - `online-tool`: embedded;
   - `linked-tool`.

   It has routes `/`, `/tools/` and `/t/[id]/` and a `404.html`. The MOD-Offline prototype consists of `src/sw/sw.ts` with Workbox modules, a `workbox-build injectManifest` post-build step, and `workbox-window` in prompt mode. It is deployed to `lab.tarokit.app` with `_headers` (no-cache for `sw.js`).
2. Visit once online, then install on Chrome desktop, Android Chrome, iOS (Add to Home Screen) and macOS Safari (Add to Dock).
3. **Go offline**, using airplane mode or the DevTools offline setting.
   - `/t/offline-tool/` must run. Test both cases: the tool visited first top-level, and visited only inside the frame.
   - `/t/online-tool/` must show the offline state, then load on reconnect with no reload.
   - `/t/nope/` must show not-found.
   - `/tools/` must list all tools.
   - Home must show the offline indicator and unavailable cards.
4. **Update:** deploy v2 while the app is open. The update message must appear after navigation or a visibility change, with no reload. Refresh must load v2 with localStorage intact.
5. **Precache size:** generate 500 fixture tools and measure precache size and install time on the mobile profile.
6. **CSP:** confirm the CSP meta (hashes) causes zero console violations from the theme script, the palette bootstrap or the SW registration.

**Pass.** Steps 3 and 4 pass on Chromium and WebKit installed contexts, and precache at 500 tools is 5 MB or less.

**Else:** switch to the "generic tool shell" fallback in ADR-0004.

## SP-5 — One typed registry drives everything; the build fails on bad content (2 h)
**Question.** Can one validated registry drive the palette, catalog, changelog, tool pages, sitemap and CSP? And does the build fail with useful messages on every invalid entry?

**Experiment.**
1. **Skeleton content:**
   - `content/tools/*.yaml` with 6 entries, including one hidden;
   - `content/projects/*.yaml` with 2 entries;
   - `categories.yaml`, `profile.yaml` and `now.yaml`.

   Each file starts with a `yaml-language-server` schema comment.
2. **MOD-Content prototype:**
   - `yaml` for parsing;
   - Ajv 2020 with `ajv-formats` compiling `specs/10-domain/project.schema.json` in place;
   - TypeScript invariant checks;
   - generated types from `json-schema-to-typescript`.

   **Consumers:** the catalog data file, `/tools/`, `/t/[id]/` through `getStaticPaths`, `/now/`, a `sitemap.xml.ts` endpoint, and `frame-src` derivation.
3. Add one valid tool file and check that it appears in all six consumers with no other edit (F-001.AC1). Check that the hidden one appears in none (F-001.AC6).
4. **Failure fixtures**, one per run:
   - duplicate id (F-001.AC2);
   - an `http:` address (F-001.AC3);
   - an external tool declared embedded (F-001.AC5);
   - an unknown category (F-001.AC7);
   - `updated` before `added` (F-001.AC8);
   - two errors at once, which must both be reported.

   Each must make `pnpm build` exit non-zero, naming the file, the entry and the rule ID.
5. **Measure:**
   - validation time for 500 entries (target under 2 s);
   - readability of Ajv's `if`/`then` errors once mapped to RULE-07;
   - the gzipped size of the standalone backup validator (target 8 KB or less), and that it runs under the CSP with no `eval`.

**Pass.** All of the above. The prototype's error format becomes MOD-Content's contract.

---

## New unknowns found in phase 3

| # | Unknown | Handling |
|---|---|---|
| U-1 | iOS installed web apps keep storage separate from Safari tabs. This affects F-003.R8 in installed mode, and whether personal data matches across contexts. | Folded into SP-1 (step 5) and SP-4 |
| U-2 | Gecko and WebKit don't gate clipboard writes by Permissions Policy, and nothing can withhold file-pick, so F-003.AC3 may hold only on Chromium. | Folded into SP-3, which leads to a RULE-10 wording change |
| U-3 | Whether `allow-forms` belongs in the base sandbox (RULE-10 "run its own code"). | Folded into SP-3 |
| U-4 | `@vite-pwa/astro` doesn't support Astro 7, so a hand-assembled Workbox pipeline is used. Also, does Astro's per-page CSP meta coexist with the header CSP and the SW? | Folded into SP-4 (step 6) |
| U-5 | Bot protection on tool, project or profile hosts may return 403 to CI, giving false failures. | Folded into SP-2 (step 4) |
| U-6 | GitHub disables scheduled workflows after 60 inactive days (public repos), so F-014.R5 can silently stop. | Release checklist item (ADR-0007), no spike |
| U-7 | Font weight with Vietnamese subsets could squeeze the NFR-11 budget. | New SP-6 |
| U-8 | Palette timing at 500 entries on 4× CPU, including the first open before the island has hydrated on slow 4G. | New SP-6 |

## SP-6 — Budget baseline on the skeleton (proposed, 2 h)
**Question.** Does the skeleton home meet NFR-11 (≤ 170 KB design budget), NFR-01 (≤ 1.5 s first, ≤ 0.5 s repeat) and NFR-02 (≤ 100 ms open, ≤ 50 ms per keystroke at 500 entries) on the reference profile?

**Experiment.** Add these to the skeleton:
- the candidate font (two subsets);
- a Lucide icon set inlined;
- the shell, home and palette islands as stubs with realistic markup;
- the 500-entry generated catalog.

Then run:
- Lighthouse CI with custom throttling: 4× CPU, 9000 and 1500 Kbps, 170 ms RTT;
- a Playwright Chromium test with CDP 4× throttling, reading `performance.mark` values for palette open and results, as the median of 5 runs.

Also measure the "shortcut pressed before hydration" path.

**Pass.** All budgets met with at least 20 % headroom. Otherwise cut font weight or subsets first, then move the palette to `client:idle` with a smaller bootstrap.

## Results
- **SP-2**: adopt (2026-10-13). The classifier agrees with Chromium, Firefox and WebKit on all fixtures; RULE-12, ADR-0001 and MOD-CatalogCheck were updated. Evidence: .build-my-app/reports/spike-embed-classifier*.md.
- **SP-5**: adapt (2026-10-13). Registry pipeline proven; ADR-0005, ADR-0009 and the budgets were amended. Evidence: .build-my-app/reports/spike-registry-pipeline.md.
- **SP-4**: adapt (2026-10-13). Offline shell, 404, update prompt and CSP proven on Chromium and WebKit; ADR-0004, ADR-0009 and ADR-0006 were amended. Open: the F-011 edge-case wording (tool service workers under WebKit). Evidence: .build-my-app/reports/spike-offline-pwa.md.
- **SP-6**: adapt (2026-10-13). Budgets pass with headroom only with build-time font subsetting; ADR-0002, ADR-0003, ADR-0006, MOD-Palette and the budgets were updated. Lighthouse simulated LCP is 1.37 s, under 1.5 s but outside the 20 % headroom bar, so it is advisory. Evidence: .build-my-app/reports/spike-perf-budget.md.
- **SP-1**: adapt → closed (2026-10-13). Shared storage confirmed on Chromium. Real Safari 27 partitions embedded localStorage and IndexedDB even same-site; Storage Access grants cookies only. ADR-0001 accepted with the documented limitation (D-038). Evidence: .build-my-app/reports/spike-shared-storage.md.
- **SP-3**: adapt (2026-10-13). Permissions-Policy needs `self`; enforcement varies by engine; allow-forms stays. Evidence: .build-my-app/reports/spike-tool-permissions.md.
