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
| `/` | SCR-Home | Greeting and time are set by an inline script at parse time, which also updates them on each minute (F-007.R1). The introduction, search entry and category row are static. The invitation, favorites and recents come from one island, and what's new from another (both `client:load`); what's new applies the 30-day window from RULE-04 in the browser. A second inline script predicts the personal sections from device storage before first paint, so nothing jumps or shows wrongly while the islands load. |
| `/tools/` | SCR-Catalog | The full grouped list is in static HTML. The island adds search and favorite toggles. Category headings and the category navigation link to category pages (F-002.R3). |
| `/tools/<category-id>/` | SCR-Category | One static page per visible category: hero with tint, intro and count, category navigation, and the tool list (F-016). Unknown or empty categories have no page, so the 404 content is served (F-016.R5). |
| `/t/<id>/` | SCR-ToolView | One page per visible tool (MOD-ToolHost). |
| `/projects/` | SCR-Projects | A `#<id>` anchor scrolls to the card and focuses it on load and on `hashchange` (F-009.R4). |
| `/projects/images/<id>.<ext>` | — | A visible project's bundled image, copied from `content/assets/` at build, with its media type from `IMAGE_TYPES` (F-009.R2). Hidden projects get none (RULE-06). |
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

Internal pure helpers, for its own islands (`src/modules/pages/whats-new.ts`, browser-safe; its date helpers come from MOD-PersonalData's `dates.ts` and are re-exported):
- `whatsNew(tools, today) → DatedItem[]`: RULE-04 what's new on the viewer's local date `today` (YYYY-MM-DD). One item per visible tool, labeled and dated by its latest date (`updated` if present, so a same-day update is labeled updated), kept when that date is within the last 30 days counting today, or at most one day ahead (a tolerance for timezone gaps with the build). Newest first, same-date ties by name, at most 6.
- `localDate(date = new Date()) → string`: the local calendar date as YYYY-MM-DD, from the local year, month and day, never from the UTC timestamp.

Home (`src/modules/pages/home/`, SCR-Home; F-007):
- `home.ts` (build time): `homeView(registry) → HomeView`: the introduction (COPY-home.intro around the nickname, or the full name without one; F-007.R5), the card data of the visible tools, the what's new candidates (every visible tool's id, name, summary and dates, with each date's text formatted once at build like SCR-Now), and the category row (`categoryRow`, below). `firstVisitText()` splits COPY-home.firstVisit around its {shortcut}.
- `categoryRow(categories, tools)` (`category.ts`): one regular CMP-CategoryTile per visible category, in display order, with the visible tool count (F-007.R7, RULE-14); the same items as the category navigation.
- `inline.ts` (browser-safe; inlined as source and hashed for the CSP):
  - the clock script, right after the greeting: `greetingPeriod(hour)` picks COPY-home.greetingMorning (05:00–11:59), greetingAfternoon (12:00–17:59) or greetingEvening; it writes the greeting and the local date and time (device locale, `Intl.DateTimeFormat` built anew on each update, so a time zone change applies on the next minute), then schedules itself for the start of the next minute. The static heading is COPY-nav.home, which only a page without scripts keeps. The clock is not a live region.
  - the reserve script, right after the personal region: `predictHome(visibleIds)`, self-contained like `readStoredTheme`, lists the visible favorites and the recents home will show (RULE-01) from the stored document (a unit test keeps it in step with MOD-PersonalData). It marks the region `data-state` (`empty` or `default`) and `data-input` (`touch` per platform-mapping, or `keyboard`), and in the default state fills it with invisible placeholder sections of the same size (the headings, and compact card outlines with each tool's name, plus the unavailable line when the device starts offline) until the island is ready. Inlined JSON escapes `<`.
- `HomePersonal.tsx` (island): SCR-Home regions 4 and 5 and the empty state. Until its device data is read, it renders both invitations (CMP-StateMessage with COPY-home.firstVisit or COPY-home.firstVisitTouch and COPY-notFound.toCatalog), and CSS shows the one the reserve script chose, or the keyboard one without scripts. Then: with no visible favorites and no shown recents, the invitation for the device; otherwise favorites (COPY-home.favorites, compact CMP-ToolCard cards in pin order) and `RecentTools`. It marks itself `data-tk-home-ready`, which removes the placeholders. Cards are unavailable offline when the tool needs the internet (F-011.R3).
- `WhatsNew.tsx` (island): SCR-Home region 7 (COPY-home.whatsNew), `whatsNew(candidates, localDate())`, each item labeled with the part of COPY-now.changelogAdded or COPY-now.changelogUpdated before {tool}, linking to the tool's portal address, with its summary and date. Nothing before hydration; as the last region, its appearing moves nothing. It marks itself `data-tk-whatsnew-ready`, also when empty.

Home's recents region (`src/modules/pages/home/RecentTools.tsx`, an island part for F-007's home; F-006):
- `<RecentTools tools text heading>`: SCR-Home region 5. `tools` are the visible tools (card data and visible ids at once), `text` is `toolCardText()`, `heading` is COPY-home.recents. It lists MOD-PersonalData's `visibleRecents` as compact cards (CMP-ToolCard; at most 8, favorites left out, RULE-01) and renders nothing when there are none, or before hydration (F-007.R3). Its styles ship with it (`recent-tools.css`).

Settings islands (`src/modules/pages/settings/`, SCR-Settings region 3):
- `DaysUsed`: COPY-settings.daysUsed and the decorative 14-day strip from the design (hidden from assistive technology), both from the stored days used and the store's one `today`.
- `ClearRecents`: COPY-settings.clearRecents opening a `ConfirmDialog` (COPY-settings.clearRecentsConfirm, COPY-common.confirm, COPY-common.cancel) that calls `clearRecents()` on confirm (F-006.R4). An `unsaved` result shows COPY-settings.clearRecentsUnsaved as an alert under the button.
- `ConfirmDialog`: the shared confirmation for destructive actions (F-013 reuses it for import and erase): a modal alertdialog named by its question, focus on Cancel, Escape cancels; it saves the focused element on open and restores it on close. A bottom sheet on narrow screens (SettingsDialogsMobile).

Helpers for SCR-Now (`src/modules/pages/now/`):
- `stale.ts` (browser-safe): `isStale(updated, today)` and `staleToday(updated)`, RULE-09 (more than 90 days) on the viewer's local date, reusing `daysBetween` and `localDate`. The `StaleLabel` island uses it.
- `now.ts` (build time): `nowView({ now, tools }) → { note?, months, empty }` from MOD-Content's `changelog()`, with dates formatted once (they are absolute) and machine-readable. With no note, the changelog title is the page heading; with no visible tools the changelog section is left out; with neither, `empty` (F-010.R4).

Catalog (`src/modules/pages/catalog/`), for SCR-Catalog:
- `catalogView(categories, tools) → { groups, nav, total, empty }` (`catalog.ts`): the grouped list from `categoryPages()`, so groups, order and navigation match the category pages (F-002.R1, R3, R6).
- `CatalogView.astro`: the page body (title, search field, category navigation, groups whose headings link to the category pages, or the empty CMP-StateMessage), rendered by `/tools/` and by a tests-only page for the empty state.
- `CatalogSearch.tsx` (island, `client:idle`): fetches the catalog data file (`catalogDataFile().path`), keeps text typed before hydration, hides the static groups while a query is entered and shows one `filterCatalog` list with each card's category label, or the no-results CMP-StateMessage with the clear action (focus returns to the field). Favorites break ties as they stand at the keystroke, so pinning a result does not move it. The result count (COPY-category.toolCount or toolCountOne) is announced in a polite live region after filtering, never at load. `catalogSearchText()` (`text.ts`) supplies its build-time strings and icons.

Build-time helpers for SCR-Category (`src/modules/pages/category.ts`):
- `categoryPages(categories, tools) → { category, path, tools, count, nav }[]`: one entry per category with visible tools, in display order, from MOD-Content's `visibleCategories` and `toolsByCategory` (F-016.R1 to R4). Categories that are unknown or have only hidden tools have no entry, so no page (F-016.R5).
- `toolCountText(count)`: COPY-category.toolCount, or COPY-category.toolCountOne for one tool (F-016.R2).

Projects (`src/modules/pages/projects/`), for SCR-Projects:
- `ProjectsView.astro`: the page body (title, CMP-ProjectCard list or the empty CMP-StateMessage, F-009.R1 to R3) from a list of visible projects and an image address per project. The route renders it from the registry.
- `projectImagePath(project)`: the image's address under `/projects/images/`, or none (F-009.R2).
- `project-anchor.ts` (browser): on load and on `hashchange`, a hash `#<id>` naming a listed card (element id `project-<id>`, `cardIdForHash`) scrolls that card into view and focuses it; any other hash leaves the page as it is, at the top (F-009.R4).

## Implements
F-002, F-016, F-007 (except R2, which is shared with MOD-Palette), F-008, F-009, F-010, F-003.R7, the settings UI for F-006.R4, F-006.R6, F-012.R2 and F-013.R4 to F-013.R6, and F-011.AC2 and F-011.AC4 (with MOD-Offline). It contributes to NFR-01 and NFR-11.
