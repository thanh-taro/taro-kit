---
id: ADR-0004
title: Service worker built with Workbox injectManifest after the static build
status: proposed
date: 2026-10-13
supersedes: []
---

## Context
F-011 and NFR-06 require the portal to:
- be installable;
- load every page, every tool address and the not-found state offline after one online visit;
- show an update message without ever reloading by itself.

Astro emits HTML only at the end of its build, so a service worker's precache list must be produced after `astro build`. The Astro wrapper `@vite-pwa/astro` (MIT) declares peer support only up to Astro 5, while we use Astro 7 (ADR-0002). Embedded tools are cross-origin and own their own offline behavior (F-011 scope).

## Decision
- The service worker source is `src/sw/sw.ts`, written against **Workbox 7** modules (`workbox-precaching`, `workbox-routing`, `workbox-strategies`, all MIT). It is bundled with Vite's build API.
- A post-build step runs **`workbox-build` `injectManifest`** over `dist/` to precache all HTML, CSS, JS, fonts, icons, the manifest and the catalog data file, with content revisions.
- Navigation handling:
  - a precached page is served for its clean URL (`/t/json/` maps to `/t/json/index.html`);
  - any other same-origin navigation falls back to the precached `404.html`, which covers F-011.AC4;
  - cross-origin requests (tools) are never intercepted.
- Update model is **prompt**:
  - the new worker waits;
  - **workbox-window** (MIT) tells the shell, which shows the update message (F-011.R4);
  - only the user's refresh action sends `SKIP_WAITING`, then the page reloads once on `controllerchange`.
- Update checks happen on navigation, on `visibilitychange` to visible, and hourly while open.
- `manifest.webmanifest` contains: `id` and `start_url` set to `/`, `scope` set to `/`, `display` set to `standalone`, the TaroKit name, and icons at 192, 512 and maskable sizes. Icons are committed design assets, not generated at build.
- `sw.js` and `manifest.webmanifest` are served with `Cache-Control: no-cache` (ADR-0007).

## Alternatives considered
- **@vite-pwa/astro and vite-plugin-pwa.** It is the usual choice, but its declared Astro range stops at 5. Using it now means unsupported peer overrides. We can revisit when it declares Astro 7 support. The SW source and update model would carry over unchanged.
- **Serwist** (MIT, an actively maintained Workbox fork). It has the same model and a similar API. It is the fallback if Workbox maintenance stalls. Switching is localized to MOD-Offline.
- **A hand-written service worker with no dependencies.** It's feasible (about 150 lines), but cache versioning, cleanup, navigation preload and range-request handling are easy to get subtly wrong. Workbox is the boring choice.
- **No service worker, HTTP cache only.** Fails NFR-06 and F-011.R1.

## Consequences
- Every generated tool page is precached. Precache size grows with the catalog: about 5 KB compressed per tool page, so 500 tools is about 2.5 MB. Spike SP-4 measures this. If it is too large, tool pages switch to a precached generic tool shell that renders from the catalog data file, while per-tool static HTML is kept for link previews.
- The offline state of non-offline-capable tools is decided by the tool view from `navigator.onLine` and the `online` event (F-003.R6). The SW doesn't decide it.
- Workbox must be checked for maintenance at each dependency review. The registry records it as a candidate (`dependencies.md`).
