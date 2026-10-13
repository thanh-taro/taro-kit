---
id: MOD-ToolHost
title: Tool view and embedding
status: draft
depends_on: [MOD-Content, MOD-SecurityPolicy, MOD-PersonalData, MOD-DesignSystem, MOD-Copy, MOD-Theme]
---

## Responsibility
MOD-ToolHost owns the content of `/t/<id>/` (SCR-ToolView).
- **Header:** CMP-ToolHeader, with the name, the favorite toggle and an always-visible open-in-new-tab action.
- **Embedded tools:**
  - **Before loading:** checks connectivity. When offline and the tool is not offline-capable, it shows the offline state and auto-loads on the `online` event (F-003.R6).
  - **Loading:** creates the iframe with the attributes from `frameAttributesFor(tool)` (MOD-SecurityPolicy) and shows the loading state. The `src` carries `theme=<shownTheme>` (`light`|`dark`) as a query parameter (F-012.R5, ADR-0011).
  - **Theme handoff:** while the frame exists, every change of `shownTheme` is posted as `{ type: "taro:theme", value }` to the tool's exact origin; a `{ type: "taro:ready" }` message is answered the same way, but only when `event.origin` equals the tool's origin and `event.source` is this frame (F-012.R6).
  - **Slow loads:** after 10 s (RULE-11), it switches the header to the slow hint while the frame keeps loading.
- **Linked tools:** the page shows the linked note with the link (F-003.R4) and records nothing until the link is followed.
- **Visits:** records one when an embedded tool's view is shown (F-006.R1).
- **Accessibility:** the accessible region name, the skip-into-tool link, and focus on the header at entry.

Unknown and hidden ids never reach this module. No page is generated for them, so the host's and the service worker's not-found page answers (MOD-Pages).

## Not responsible for
- Deciding sandbox and permission attributes (MOD-SecurityPolicy owns the mapping).
- Detecting a refused embed at runtime, which can't be done reliably. The always-visible open action is the fallback, and MOD-CatalogCheck prevents refused embeds before publishing.
- The tool's own offline behavior.

## Public surface
- `<ToolView tool>` (an Astro page part plus the `ToolFrame` island).
- `openTool(tool, { from })`, a shared helper for cards and the palette. It opens linked tools in a new tab with `noopener noreferrer`, records the visit, and navigates to `/t/<id>/` for embedded tools.

## Implements
F-003.R1 to F-003.R6 and F-003.R8 (with SP-1), F-006.R1, and F-012.R5–R6 (with MOD-Theme). It contributes to NFR-08 and to F-011.AC3.
