---
id: MOD-Offline
title: Offline and install
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-Offline makes the portal installable and offline-capable (ADR-0004).
- **Install:** `manifest.webmanifest` with the TaroKit name, icons, `display: standalone`, and scope and start URL set to `/`. It is built from COPY-shell.brand and the dark theme's `bg` token (`webManifest()`), with the committed DEP-17 icons (192, 512 and maskable 512 PNGs in `public/icons/`, sources in `assets/brand/`). The favicon (`FAVICONS`: `favicon.svg`, the app icon copied as-is, and a 32 px PNG fallback, both written by `scripts/brand-icons.ts`) is linked from every page by MOD-Shell's `<BaseLayout>` and precached with the other icons.
- **Service worker:**
  - The source is `src/sw/sw.ts`, bundled with Astro's Vite and given its precache manifest after the build, so the list includes `astro:build:done` output such as the catalog data file. It installs with 6 requests in flight (SP-4).
  - The precache holds every page (`404.html` included), all CSS, JS and fonts, the catalog data file, the manifest, the icons, the avatar and the project images. `sw.js`, `_headers`, the sitemap, `robots.txt`, text files and MOD-Meta's link-preview image (fetched only by other sites) are left out.
  - Navigations use clean URLs: a precached page answers from the precache; any other same-origin navigation goes to the network, with a fallback to the precached `404.html` (status 404).
  - Cross-origin requests are never intercepted.
- **Registration and updates:** `workbox-window` with the prompt model. It exposes `updateReady` and `activateUpdate()`, which posts `SKIP_WAITING` and reloads once on `controllerchange`. It never reloads by itself (F-011.R4).
- **Update checks:** on navigation, on visibility, and hourly.
- **Connectivity:** the `online` signal, from `navigator.onLine` plus the online and offline events.

## Not responsible for
- Tools' own offline behavior.
- The update and offline UI (MOD-Shell), and the per-tool offline state (MOD-ToolHost).
- Cache headers (MOD-SecurityPolicy writes `_headers`).

## Public surface
- Signals: `online` and `updateReady`.
- `activateUpdate()`, and `connectOffline()`, which MOD-Shell calls once per page to register the worker.
- `webManifest()` (served at `/manifest.webmanifest`).
- The post-build CLI, `pnpm sw:build` (`precacheEntries(distDir)`, `buildServiceWorker(root, distDir)`), which prints the precache size.

## Implements
F-011.R1, F-011.R2 and F-011.R4 (mechanism). It is the main owner of NFR-06.
