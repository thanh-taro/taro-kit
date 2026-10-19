---
title: Platform mapping (neutral spec wording to web platform)
status: draft
---

# Platform mapping

The neutral layers (00 to 30, 50) describe behavior without naming technology. This table is the single place where that wording is bound to web platform features for this stack (ADR-0002). If a row changes, the ADR that owns it changes too.

## Addresses and navigation

| Spec wording | Web platform | Owner |
|---|---|---|
| Portal's site / tool's site (ADR-0001) | Registrable domain (eTLD+1, per the Public Suffix List). Portal at `https://<apex>/`, own tools at `https://<tool>.<apex>/` | ADR-0001, ADR-0007 |
| Stable portal address of a tool (F-003.R1) | `/t/<id>/`, a pre-rendered static page | MOD-Pages, MOD-ToolHost |
| Page address (Home, Tools, Projects, About, Now, Settings) | `/`, `/tools/`, `/projects/`, `/about/`, `/now/`, `/settings/` | MOD-Pages |
| Category page address (F-016.R1) | A static route `/tools/<category-id>/` per visible category, generated from the registry. Unknown or empty categories get no page, so the host serves 404 content (F-016.R5). | MOD-Pages |
| Project's address on the projects page (F-009.R4) | Fragment `/projects/#<id>`. On load and `hashchange`: `scrollIntoView` then `focus()` (cards get `tabindex="-1"`) | MOD-Pages |
| Not-found state (F-003.R7) | `404.html` with HTTP 404 (host `not_found_handling`). Offline, the service worker falls back to the precached `404.html`. | MOD-Pages, MOD-Offline |
| Opens in a new tab | `<a target="_blank" rel="noopener noreferrer">`, or `window.open(url, "_blank", "noopener,noreferrer")` from the palette | MOD-ToolHost |
| Email link starts a new message | `mailto:` link | MOD-Pages |
| Site index (F-015.R3) | `/sitemap.xml` (sitemaps.org 0.9) and `/robots.txt` | MOD-Meta |
| Open link-preview metadata standard (NFR-12) | Open Graph `og:*` meta, plus `twitter:card` | MOD-Meta |

## Embedded tools

| Spec wording | Web platform | Owner |
|---|---|---|
| Embedded / isolated from the portal (NFR-08, RULE-10) | `<iframe sandbox="allow-scripts allow-same-origin allow-forms">` on a **different origin** of the same site. Never `allow-top-navigation*`. | MOD-SecurityPolicy, MOD-ToolHost |
| Permission set (RULE-10) | See the mapping table in ADR-0009 (`allow=` features and extra `sandbox` tokens), plus a portal `Permissions-Policy` that delegates each feature only to declaring tool origins | MOD-SecurityPolicy |
| Restricts which sites may be embedded (NFR-08) | CSP `frame-src` set to the visible embedded tool origins (meta, from Astro `security.csp`) | MOD-SecurityPolicy |
| Can't read or change the portal's content or personal data | Same-origin policy: the tool's origin differs from the portal's, so it has no DOM, storage or SW access. No `postMessage` listener is exposed. | ADR-0009 |
| Never navigates the portal page | No `allow-top-navigation*` token; COOP `same-origin` on the portal | ADR-0009 |
| Cannot navigate its area outside its own site | CSP `frame-src` is evaluated on every navigation of the frame | ADR-0009 |
| Tool's site declares no embedding restriction / allows the portal's site (RULE-12) | The tool's final response has neither `X-Frame-Options` nor an enforced `Content-Security-Policy` `frame-ancestors` that excludes `https://<apex>` | MOD-CatalogCheck |
| Embedded region's accessible name | `title="<name> tool"` on the iframe, plus a labelled region | MOD-ToolHost |
| Tool has loaded | The iframe `load` event. A refused embed can't be detected reliably, so the open-in-new-tab action is always shown. | MOD-ToolHost |

## Device, storage and offline

| Spec wording | Web platform | Owner |
|---|---|---|
| Stored on the device / personal data (INV-05) | `localStorage["tarokit.personal"]`, one JSON document shaped like `personalData` (ADR-0010) | MOD-PersonalData |
| Device storage unavailable (F-005.R5) | Writing and removing a probe key throws or is blocked, so an in-memory store is used | MOD-PersonalData |
| Another open window changed data | `storage` event, plus a re-read on `focus` | MOD-PersonalData |
| Installable / installed app (F-011.R1) | `manifest.webmanifest` (name, icons 192/512/maskable, `display: standalone`, `start_url` and `scope` `/`), a registered service worker, and HTTPS | MOD-Offline |
| Works offline (NFR-06) | Service worker precache of all pages and assets (Workbox `injectManifest`) | MOD-Offline |
| Device is offline / connection returns | `navigator.onLine`, plus the `offline` and `online` events | MOD-Offline |
| New version published (F-011.R4) | A new service worker reaches `installed`/`waiting` (`workbox-window` `waiting` event). Refresh sends `SKIP_WAITING`, then reloads on `controllerchange`. | MOD-Offline, MOD-Shell |
| Backup file saved on the device (F-013.R1) | `Blob` (`application/json`) plus an `<a download="tarokit-backup-YYYY-MM-DD.json">` click. The File System Access API is not used (Gecko and WebKit lack it). | MOD-Backup |
| Import a file (F-013.R2) | `<input type="file" accept=".json,application/json">`, then `File.text()` and `JSON.parse` | MOD-Backup |
| Copy the current page's address (F-004.R5) | `navigator.clipboard.writeText(location.href)` within the user gesture | MOD-Palette |

## Time, locale, input and appearance

| Spec wording | Web platform | Owner |
|---|---|---|
| Local date and time in the device's locale format (F-007.R1) | `Intl.DateTimeFormat(undefined, …)`. Re-created every minute, so time-zone changes apply. A timer is aligned to the next minute boundary. | MOD-Copy, MOD-Pages |
| Local date, YYYY-MM-DD (RULE-13, F-013.R1) | Built from `getFullYear`, `getMonth` and `getDate`, never from `toISOString` (which is UTC) | MOD-PersonalData |
| Mod+K, Command on Apple keyboards (F-004.R1) | `keydown` with `key === "k"` and `metaKey` on Apple platforms (`navigator.userAgentData?.platform`, falling back to `navigator.platform`), `ctrlKey` elsewhere | MOD-Palette |
| Device with a keyboard / touch-only device (F-007.R6) | Touch-only means `matchMedia("(any-hover: none) and (any-pointer: coarse)")`. Anything else is treated as having a keyboard. | MOD-Pages |
| Modal palette | `<dialog>` with `showModal()`, plus the ARIA combobox/listbox pattern and `aria-live` for the result count | MOD-Palette |
| Follows the device's light/dark setting (RULE-03) | `prefers-color-scheme` media query plus its `change` listener; CSS `color-scheme` | MOD-Theme |
| First painted screen already in the chosen theme (F-012.R4) | A blocking inline script as the first element of `<body>` (after Astro's CSP meta, so the hash applies), setting `data-theme` on `<html>` before any content paints | MOD-Theme |
| Bundled fonts, icons and images; zero third-party requests (NFR-05) | Self-hosted WOFF2 and inline SVG; CSP `default-src 'self'`, `connect-src 'self'`, `img-src 'self' data:`, `font-src 'self'` | ADR-0003, ADR-0009 |
| No cookies (NFR-05) | The portal sets none. The host's cookie-setting features are off (ADR-0007), and a smoke test asserts that no `Set-Cookie` header is sent. | ADR-0007 |
| Text zooms without loss and follows the browser's text size (NFR-07) | Type-size tokens are emitted to `tokens.css` in `rem` (px ÷ 16, so the default renders the same); spacing, radii and targets stay in px | MOD-DesignSystem |
| A cue that isn't color alone survives forced colors (NFR-03) | Selected or current states add a transparent `outline`, which only forced-colors mode paints; filled indicators use `CanvasText` under `@media (forced-colors: active)` | MOD-DesignSystem, MOD-Pages, MOD-Palette, MOD-Shell |
| Touch targets of at least 44 × 44 CSS px (NFR-09) | `min-block-size` and `min-inline-size` set to 44px under `@media (pointer: coarse)` | MOD-DesignSystem |

## Publishing

| Spec wording | Web platform / service | Owner |
|---|---|---|
| Building the portal (F-001.R2) | `pnpm build`: content validation, then `astro build`, then the SW build, then headers | MOD-Delivery |
| Publishing / a publish is stopped (F-014.R1) | `publish.yml` deploy job `needs:` the catalog-check job; `wrangler deploy` | MOD-Delivery |
| Weekly run, Owner notified on failure (F-014.R5) | `schedule:` cron in `weekly-check.yml`; GitHub's failed-workflow email | MOD-Delivery |
