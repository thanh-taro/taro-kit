---
id: MOD-Offline
title: Offline and install
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-Offline makes the portal installable and offline-capable (ADR-0004).
- **Install:** `manifest.webmanifest` with the TaroKit name, icons, `display: standalone`, and scope and start URL set to `/`.
- **Service worker:**
  - The source is `src/sw/sw.ts`, with the precache manifest injected after the build.
  - Navigations use clean URLs, with a fallback to the precached `404.html`.
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
- `activateUpdate()`.
- The post-build CLI, `pnpm sw:build`.

## Implements
F-011.R1, F-011.R2 and F-011.R4 (mechanism). It is the main owner of NFR-06.
