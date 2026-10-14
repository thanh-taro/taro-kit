---
id: MOD-Pages
title: Pages and routes
status: draft
depends_on: [MOD-Content, MOD-Shell, MOD-Search, MOD-PersonalData, MOD-ToolHost, MOD-Backup, MOD-Theme, MOD-DesignSystem, MOD-Copy]
---

## Responsibility
MOD-Pages owns the Astro routes and screen composition. Each page is pre-rendered static HTML, which is the no-JS baseline, with islands only where device data or interaction is needed.

| Route | Screen | Notes |
|---|---|---|
| `/` | SCR-Home | Greeting and time are set by an inline script at parse time, then updated each minute by an island (F-007.R1). Favorites, recents and what's new come from an island (`client:load`). What's new applies the 30-day window from RULE-04 in the browser. |
| `/tools/` | SCR-Catalog | The full grouped list is in static HTML. The island adds search and favorite toggles. Category headings and the category navigation link to category pages (F-002.R3). |
| `/tools/<category-id>/` | SCR-Category | One static page per visible category: hero with tint, intro and count, category navigation, and the tool list (F-016). Unknown or empty categories have no page, so the 404 content is served (F-016.R5). |
| `/t/<id>/` | SCR-ToolView | One page per visible tool (MOD-ToolHost). |
| `/projects/` | SCR-Projects | A `#<id>` anchor scrolls to the card and focuses it on load and on `hashchange` (F-009.R4). |
| `/about/` | SCR-About | Static, with no island. |
| `/now/` | SCR-Now | Static changelog grouped by month. A small island adds the stale label for RULE-09 against the viewer's date. |
| `/settings/` | SCR-Settings | The theme choice, clear recents, days used, and export, import and erase with confirmations. |
| `404.html` | SCR-NotFound | Served by the host for unknown and hidden ids, and by the service worker offline. |

## Not responsible for
- Head metadata and the site index (MOD-Meta).
- Validation (MOD-Content).
- Rule logic (MOD-PersonalData, MOD-Search).

## Public surface
Routes only. Nothing is imported by other modules.

Internal pure helpers, for its own islands (`src/modules/pages/whats-new.ts`, browser-safe, no imports beyond types):
- `whatsNew(tools, today) → DatedItem[]`: RULE-04 what's new on the viewer's local date `today` (YYYY-MM-DD). One item per visible tool, labeled and dated by its latest date (`updated` if present, so a same-day update is labeled updated), kept when that date is within the last 30 days counting today, or at most one day ahead (a tolerance for timezone gaps with the build). Newest first, same-date ties by name, at most 6.
- `localDate(date = new Date()) → string`: the local calendar date as YYYY-MM-DD, from the local year, month and day, never from the UTC timestamp.

## Implements
F-002, F-016, F-007 (except R2, which is shared with MOD-Palette), F-008, F-009, F-010, F-003.R7, the settings UI for F-006.R4, F-006.R6, F-012.R2 and F-013.R4 to F-013.R6, and F-011.AC2 and F-011.AC4 (with MOD-Offline). It contributes to NFR-01 and NFR-11.
