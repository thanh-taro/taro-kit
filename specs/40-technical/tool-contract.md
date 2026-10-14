---
title: Tool author contract
status: draft
---

# Tool author contract

How a separate tool project (for example the JSON Formatter) must behave to be listed in TaroKit and embedded. Every rule here comes from a spec or ADR, which is cited. Those sources stay authoritative; this page only collects them.

## Hosting
- Serve the tool from its own subdomain: `https://<tool>.tarokit.app`. It must never be served from `tarokit.app` itself (ADR-0001, INV-03).
- HTTPS only (INV-02).
- **Allow the portal to embed you**: send `Content-Security-Policy: frame-ancestors https://tarokit.app`. Do not rely on `X-Frame-Options: SAMEORIGIN`, which blocks the portal (SP-2, RULE-12). The catalog check fails publishing if the header is wrong (F-014).

## Inside the portal's frame
- The base sandbox is `allow-scripts allow-same-origin allow-forms`. Extra capabilities are granted only through the tool's catalog `permissions` (RULE-10, ADR-0009). Enforcement varies by browser: no browser can stop file inputs, and Safari cannot stop clipboard writes.
- `window.open` works, but the portal's opener reference is null, so don't depend on `window.opener` (ADR-0009).
- **Storage**: keep user data in localStorage. In Chrome, Edge and Firefox, the tool sees the same localStorage embedded and direct. Safari keeps separate storage for the embedded tool, and the Storage Access API does not change that (F-003.R8, D-038). IndexedDB and the tool's own service worker may also differ when embedded.
- Offline: if `offline: true`, the tool's own service worker must work after the tool has been opened inside the portal once while online (ADR-0009, SP-4).

## Theme hand-off (F-012.R5/R6, ADR-0011)
- The portal opens the embedded tool with `?theme=light` or `?theme=dark`. Read it before first paint.
- After loading, the tool may post `{ type: 'taro:ready' }` to `https://tarokit.app`. The portal answers with `{ type: 'taro:theme', theme }` and sends it again whenever the theme changes. Accept messages only when `event.origin === 'https://tarokit.app'`.
- When the tool is opened directly (linked, or through open-in-new-tab), no theme is passed; use your own default or the device setting.
- If the tool has a service worker, ignore the `theme` query parameter when matching cached pages (`ignoreSearch`).
- Nothing else is exchanged with the portal (D-039).

## Catalog entry
- Add one YAML file under `content/tools/` in the TaroKit repo, matching the schema (F-001). Keep `hidden: true` until the tool is deployed and passes the catalog check (D-012, F-014).
