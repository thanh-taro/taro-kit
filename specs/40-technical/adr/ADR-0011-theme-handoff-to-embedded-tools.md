---
id: ADR-0011
title: Theme handoff to embedded tools — address parameter plus origin-checked messages
status: accepted
date: 2026-10-13
supersedes: []
---

## Context
F-012.R5–R6 (change request from the JSON Formatter, its decision D-008) require embedded tools
to match the portal's theme from their first frame and to follow later changes without reloading.
A message alone cannot avoid a flash, because it arrives after the tool's first paint. Tools are
separate sites on subdomains (ADR-0001) inside the sandbox of ADR-0009, so the portal cannot touch
their pages directly, and nothing beyond the theme may be shared (PRN-01).

## Decision
- **Initial theme**: MOD-ToolHost appends `theme=light|dark` (the resolved theme showing, never
  `system`) to the iframe `src`. Tools apply it in a blocking head script before first paint.
- **Changes**: on every change of `shownTheme`, the portal calls
  `frame.contentWindow.postMessage({ type: "taro:theme", value }, toolOrigin)` with the tool's
  exact origin as the target — never `"*"`.
- **Handshake**: a tool may post `{ type: "taro:ready" }` to the parent. The portal answers with
  the current theme only if `event.origin === toolOrigin` and `event.source === frame.contentWindow`;
  everything else is ignored. This covers a theme change during the tool's load.
- Tools that ignore the parameter and messages are unaffected.

## Alternatives considered
- **Site-wide cookie on `.tarokit.app`** — readable before first paint, but no live update and it
  would share portal state with every subdomain.
- **Messages only** — the tool would flash the wrong theme until the first message.
- **No handoff** — tools follow the device setting and mismatch when the Owner overrides the theme.

## Consequences
- The theme value becomes visible in the tool's address (and its request logs on the host);
  it is the one exception to INV-05 (D-039).
- Changing the `src` query does not change the frame's origin, so frame-src (ADR-0009) is unaffected.
- Offline-capable tools must ignore the query string when matching their cached page (e.g. `ignoreSearch`), or an offline open with `?theme=` misses the cache (F-003.R6).
- E2E: a stub tool on a second origin asserts the parameter, the message on toggle, and that a
  ready message from another origin gets no answer (F-012.AC5–AC7).

## Acceptance (2026-10-14, D-039)
Accepted after spec review. D-039 amends D-008: nothing is shared at runtime except the theme showing. The postMessage target is the tool's exact origin; the portal checks `event.origin` and `event.source` (the tool's own frame). When a frame is reloaded after coming back online (F-003.R6), its `src` carries the theme showing at that moment. Tools must ignore the `theme` query parameter when matching cached pages (`ignoreSearch`); this is listed in the tool-author guidance.
