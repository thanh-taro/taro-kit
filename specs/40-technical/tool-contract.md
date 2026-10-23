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
- **Cookies**: tools share the `tarokit.app` site with the portal, so a `Domain=.tarokit.app` cookie would reach the portal and every other tool. Scope cookies to your own host (no `Domain` attribute). The portal sets and reads no cookies, and never will (architecture.md, Runtime boundaries).
- Offline: if `offline: true`, the tool's own service worker must work after the tool has been opened inside the portal once while online (ADR-0009, SP-4).

## Your users' data (F-018, D-058)
The portal's privacy policy and terms promise these for every tool the Owner builds (origin `own`), so each such tool must keep them:
- **Processed on the device**: files and text the user gives the tool are processed in the browser and never uploaded or sent anywhere. Prefer enforcing it with `Content-Security-Policy: connect-src 'none'` (or only the tool's own origin for its own static files).
- **Originals never change**: the tool never modifies a file the user opened in it. Anything it saves is a new file the user chooses to download or save.
- **Says how it handles data**: the tool states its own data handling inside the tool (F-018 scope, COPY-settings.privacyTools).
- A tool that can't keep these is not listed until the policies are changed first.

## Theme hand-off (F-012.R5/R6, ADR-0011)
- The portal opens the embedded tool with `?theme=light` or `?theme=dark`. Read it before first paint.
- After loading, the tool may post `{ type: 'taro:ready' }` to `https://tarokit.app`. The portal answers with `{ type: 'taro:theme', value }` (`value` is `'light'` or `'dark'`) and sends it again whenever the theme changes. Accept messages only when `event.origin === 'https://tarokit.app'`.
- Treat every `taro:theme` message as "apply this value": the same value can arrive more than once (for example, a theme change just before `taro:ready`).
- When the tool is opened directly (linked, or through open-in-new-tab), no theme is passed; use your own default or the device setting.
- If the tool has a service worker, ignore the `theme` query parameter when matching cached pages (`ignoreSearch`).
- Nothing else is exchanged with the portal besides the language below (D-039, F-019.R7).

## Language hand-off (F-019.R7, ADR-0012)
- The portal shows English (`en-US`) or Vietnamese (`vi-VN`), and tells the embedded tool which: the frame address carries `?lang=en-US` or `?lang=vi-VN` next to `theme`. Read it before first paint and set `<html lang>` to match.
- The answer to `taro:ready` includes `{ type: 'taro:language', value }` (`'en-US'` or `'vi-VN'`) next to `taro:theme`, and the portal sends `taro:language` again whenever the user switches. Apply it without reloading, keeping the user's work (typed text, open files, scroll). Same origin check as the theme.
- Treat every `taro:language` message as "apply this value"; the same value may arrive more than once.
- A tool that only has English keeps working: ignoring the parameter and the message is allowed. A tool that supports other languages maps the two values to its closest one.
- A frame reloaded when the device comes back online (F-003.R6) carries the language showing at that moment.
- When opened directly (linked, or through open-in-new-tab), no language is passed; use the browser's preferred languages or your own default.
- If the tool has a service worker, ignore the `lang` query parameter when matching cached pages (`ignoreSearch`), as for `theme`.

## Catalog entry
- Add one YAML file under `content/tools/` in the TaroKit repo, matching the schema (F-001). Keep `hidden: true` until the tool is deployed and passes the catalog check (D-012, F-014).
