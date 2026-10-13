# Spike SP-4 offline-pwa 3h

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-4. Unknowns U-1 (partly) and U-4.
- Inputs: ADR-0004 (Workbox injectManifest after the build, prompt updates), ADR-0009 (per-page frame-src), F-011.
- Time box: 3 h of agent work. Built on the SP-5 skeleton (`spikes/sp5` from branch `spike/sp5`, copied to `spikes/sp4`).
- Not built: production code, design, real icons. Local only (`*.localhost`), because the real domain is not live yet.
- Note: this file did not exist when the spike started. The SP-4/SP-6 framing commit (f338e72) wrote to `.build-my-app/reports/spike-.md` (empty slug), which now holds only SP-6. This file restores the SP-4 framing above.

## SP-4 result

**Verdict: ADAPT.** Keep ADR-0004 (Workbox 7 + injectManifest + workbox-window prompt) and per-tool static pages. Don't switch to the generic-tool-shell fallback. Three changes are needed: replace Workbox's one-request-at-a-time precache install with a parallel install, add an explicit navigation route so the 404 fallback works, and correct the F-011 edge case for WebKit. U-4 is closed: per-page CSP, the header CSP and the SW coexist.

Branch: `spike/sp4`. Code: `spikes/sp4/`. Evidence: `spikes/sp4/results/`.

### Setup
- Astro 7.3.8, Preact, Node 24.19, pnpm 11.25. Workbox 7.3.0 (`workbox-precaching`, `-routing`, `-strategies`, `-window`, `-build`). Playwright 1.56.1 (Chromium 141, WebKit 26.0).
- Hosting (`scripts/servers.ts`) emulates the ADR-0007/0009 `_headers`: header CSP `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, COOP, nosniff, `no-cache` on HTML/`sw.js`/manifest, `immutable` on `/_astro/`, gzip, and an unknown path returns `404.html` with status 404.
- Hosts are same-site, like production: portal `portal.localhost:4640`, offline-capable tool (with its own SW) `offline.portal.localhost:4641`, online-only tool `online.portal.localhost:4642`, and a linked tool `https://linked.example.org/`. Ports 4600–4602 were taken by another agent's server.
- SW: `src/sw/sw.ts` is bundled by esbuild, then `injectManifest` runs over `dist/` (`scripts/build-sw.ts`). The client half is in `src/layouts/Base.astro`. The tool-view offline state is in `src/pages/t/[id].astro`.
- Offline means the hosting servers are closed with their sockets dropped, plus `context.setOffline(true)`. In WebKit, see the harness notes.
- Commands: `node scripts/build-variants.ts`, then `node scripts/e2e.ts chromium` and `NOSHOT=1 OFFLINE_MODE=hybrid node scripts/e2e.ts webkit`.

### Results vs success measures
| Measure | Chromium 141 | WebKit 26 |
|---|---|---|
| (a) After one online visit, these load offline: `/`, `/tools/` (8/8 tools), every category page (5/5, with the right counts), every `/t/<id>/` (8/8), and `/t/nope/` (404 + not-found) | **pass** (both runs) | **pass** |
| (b) Offline indicator, and unavailable markers on linked and non-offline-capable tools | pass | pass |
| (b) online-tool shows the offline state, then loads on reconnect with no page reload | pass | pass |
| (b) offline-tool runs in the frame offline, when it was first opened **inside the frame** | pass | pass 3/3 with the network down. 1/2 under Playwright's offline emulation (harness flake). |
| (b) offline-tool runs in the frame offline, when it was first opened **only top-level** | pass | **FAIL (real).** See "What surprised me". |
| (c) Update via `visibilitychange`: "update ready" shown, no auto reload over 3 s; Refresh reloads exactly once into v2 with localStorage intact | pass (detected in 0.3 s) | pass (0.3 s) |
| (c) Same, with the update found after an in-scope navigation | pass (2.6 s) | pass (1.3 s) |
| (d) Precache at 500 tools (509 pages, 517 entries) | 1,686 KB raw / **728 KB gzip** / 574 KB brotli. Pass bar ≤ 5 MB. | same |
| (d) First-visit install on Slow 4G (1.6 Mbps, 150 ms per request), 4× CPU | Workbox stock: **83.5 s**. Parallel ×6: **28.1 s**. 9 tools: 3.9 s. | stock **86.1 s**, ×6 **15.6 s**, 9 tools 5.1 s |
| (e) CSP violations from the theme, palette or SW registration across 8 pages, online and SW-served | **0** | **0**. Screenshots must be off; see the harness notes. |
| (e) SW-served page keeps the header CSP and the per-page meta `frame-src`; a foreign frame origin is refused | pass | pass |

Other numbers:
- The 500-tool build plus the SW step takes 3.6–11 s.
- `sw.js` is 18 KB (6.4 KB gzip) at 9 tools and **58 KB (18.7 KB gzip) at 500**, because the manifest is inlined.
- Average tool page is 1.4 KB gzip on the bare skeleton. At the ADR's 5 KB per page, 500 tools would be about 2.6 MB, still under 5 MB.
- Installed-app checks on real phones are **deferred to SP-1's lab**. Firefox **deferred**: the agent sandbox kills the Playwright Firefox launch (same as SP-2). The user can run `NOSHOT=1 node scripts/e2e.ts firefox`.

### What surprised me
1. **Workbox precaches one request at a time** (`PrecacheController.install`, workbox#2528). With 517 entries, install time is driven by round-trip time: 84–86 s on Slow 4G. The portal is only offline-ready, and the update banner only appears, once install finishes. Driving the same `PrecacheController`/strategy from our own `install` handler with 6 requests in flight cut this to 28 s (Chromium) and 15.6 s (WebKit), with identical bytes (783 KB). It took about 15 lines (`sw.ts`, `__PRECACHE_CONCURRENCY__`).
2. **The 404 fallback needs a route.** Workbox's `setCatchHandler` fires only for requests some route handled, so `/t/nope/` gave `ERR_INTERNET_DISCONNECTED` until a same-origin `navigate` → `NetworkOnly` route was added.
3. **WebKit partitions service worker registrations by top-level origin, not by site.**
   - localStorage *is* shared between `offline.portal.localhost` top-level and the same-site frame (`scripts/partition-probe.ts`: `ls: "top-level"`).
   - The SW registered during a top-level visit does **not** control the frame, with or without `sandbox` (`controlled: false`). Chromium: `controlled: true`.
   - So in Safari, an offline-capable tool works offline in the portal only if it was opened *inside the portal* while online. This feeds U-1 and SP-1.
4. **Per-page `frame-src` works from the layout.** `Astro.csp.insertDirective` in `Base.astro` defaults to `'none'` and pages pass their tool origin. A generic tool shell (the ADR-0004 fallback) could *not* keep per-page `frame-src`: its static meta can't name the tool, so it would need the SP-5 16 KB site-wide list or a CSP header written by the SW. That is one more reason to keep per-tool pages.
5. **Lie-fi.** If the connection drops before `offline` fires, a non-offline-capable frame keeps a network-error page. The tool view now reloads a *paused* frame on reconnect, never the portal page.
6. **Harness notes for ADR-0006:**
   - Playwright WebKit's `setOffline` fails navigations and subresources *before* the SW sees them ("internal error"). WebKit offline E2E must drop the network (stop the server) and use emulation only to flip `navigator.onLine` ("hybrid" mode).
   - Playwright WebKit screenshots inject an inline `<style>`, which reports a `style-src-elem` CSP violation (verified: 6 → 0 with `NOSHOT=1`). Visual-regression runs must ignore CSP reports raised during the screenshot.
   - Chromium `setOffline` behaves correctly with SWs.

### Edits needed (proposed, not applied)
- **ADR-0004 (Decision):**
  - Replace `precacheAndRoute` with a `PrecacheController` plus our own install loop with 6 requests in flight, `PrecacheRoute`, and `activate`.
  - Add the same-origin navigation `NetworkOnly` route that backs the `404.html` catch handler.
  - Keep `sw.js` at `no-cache`.
- **ADR-0004 (Consequences):**
  - Replace the "about 2.5 MB" estimate with the measured 728 KB gzip at 500, and record the install time (28 s / 16 s at ×6 vs 84–86 s stock on Slow 4G).
  - Note that a shared-layout change re-revisions every HTML page, so each such deploy re-downloads all of them (about 0.75 MB) before the update message shows. This is inferred from Workbox's revision model, not measured.
  - Drop the generic-shell fallback trigger, or keep it only for "precache > 5 MB", and note its CSP conflict.
- **ADR-0009:** U-4 closed. Record that per-page `frame-src` is inserted from the layout (`'none'` by default), that `worker-src 'self'` and `manifest-src 'self'` are needed, and that SW-served responses keep both the meta and header policies.
- **F-011, Edge cases (spec change, user approval):** "An offline-capable embedded tool that the user has never opened **inside the portal** while online may still fail offline. In some browsers, a direct visit to the tool doesn't count."
- **F-003.R6 / SCR-ToolView:** on reconnect, a paused frame is reloaded. The portal page itself never reloads.
- **SP-1:** add "SW controls the frame after a top-level registration" to the probe. WebKit 26 says no here, even same-site.
- **ADR-0006:** add the two Playwright WebKit caveats (offline method, screenshot CSP noise).
- **spikes.md, SP-4 pass bar:** installed-context checks are deferred to the SP-1 lab rig. The local Chromium and WebKit pass is recorded above.
