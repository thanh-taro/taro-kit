---
id: MOD-Palette
title: Command palette
status: draft
depends_on: [MOD-Search, MOD-PersonalData, MOD-Theme, MOD-Backup, MOD-Copy, MOD-DesignSystem]
---

## Responsibility
MOD-Palette provides the command palette (CMP-CommandPalette).
- **Bootstrap:** an inline script of about 1 KB.
  - It listens for Mod+K (Meta on Apple platforms, Control elsewhere) and for activation of the search control.
  - It opens the pre-rendered `<dialog>` with `showModal()` and focuses the input immediately (100 ms target, NFR-02).
  - It then loads the island if it hasn't loaded yet.
- **Island:**
  - fetches the catalog data, which is prefetched on idle and cached by the service worker;
  - renders the empty-query groups (Favorites, Recents, Pages) and the query groups (Tools, Projects, Pages, Actions) using MOD-Search;
  - implements the combobox and listbox keyboard model across groups;
  - announces the result count;
  - runs results: tools as in F-003 and F-006.R1 (linked tools open a new tab and record a visit), pages, projects (`/projects/#<id>`), and actions (toggle theme, export, copy address with confirmation);
  - restores focus on close.

## Not responsible for
- Ranking (MOD-Search).
- Pinning, which is not offered from the palette.
- Shortcut handling inside embedded tools. The tool keeps the keystroke (F-004 edge case).

## Public surface
- `<PaletteDialog>` (the island) and `paletteBootstrap` (an inline source string, CSP-hashed).
- An `openPalette()` event other islands can dispatch, for example from the home search entry.

As built (F-004), in `src/modules/palette/`:
- `PaletteDialog.astro`: the static `<dialog id="tk-palette">` named COPY-palette.dialogLabel, holding the `Palette` island (`Palette.tsx`, `client:palette`: a custom client directive, `directive.ts`, that hydrates at idle time or at once when the bootstrap opens the palette and dispatches `PALETTE_HYDRATE_EVENT`). MOD-Shell's BaseLayout mounts it on every page, renders `paletteBootstrap` last in `<body>` and registers its hash before `<head>`.
- The bootstrap arms Mod+K, any element marked `data-tk-palette-open` (the shell's search controls), `data-tk-palette-close` (the touch sheet's Cancel), a click on the dialog's backdrop, and the `OPEN_PALETTE_EVENT` document event (`openPalette()`). It writes the platform's shortcut into `data-tk-shortcut` key caps (`SHORTCUT_LABELS`: ⌘K on Apple platforms, Ctrl K elsewhere), sets `aria-keyshortcuts`, picks the placeholder, empties the field on close and returns focus to the element focused before opening. Until the island marks the field `data-live`, the bootstrap keeps an Enter as `data-pending-enter`; the island (and an Enter before the data loads) runs the highlighted result once settled. Running a project already in view re-dispatches `hashchange` after the dialog's `close` event, so the card keeps the focus.
- `logic.ts` (pure, unit-tested): `paletteIndex(data, pages, actions)`, `emptyQueryGroups(index, doc)` (Favorites at most `PALETTE_FAVORITES_MAX` = 8 in pin order, Recents by MOD-PersonalData `visibleRecents`, Pages), `paletteView(query, index, doc)`, `runEntry(entry, env) → 'closed' | 'copied'` (everything closes the palette before it navigates or acts, except export, which closes after the backup is saved and otherwise reports `exportFailed`, shown with COPY-palette.exportFailed; copy-address reports `copied`, shows COPY-palette.copied for `COPIED_MS` = 1200 ms, then closes; a refused clipboard write just closes), `isApplePlatform`, `isPaletteShortcut`, `matchRange` (the matched part of a name, marked in the row).
- `text.ts` (build time): `paletteText()` (the island's strings and icons) and `searchControlLead()` (COPY-palette.placeholder before its shortcut, for the shell control).
- Export runs MOD-Backup `exportBackup()`, imported lazily on use.
- If the catalog data file can't load, the island offers pages and actions only and shows COPY-palette.unavailable (F-004 edge case).

## Implements
F-004 (all requirements) and F-007.R2. It is the main owner of NFR-02, and contributes to NFR-04.

## Normative from spike SP-6
- The empty-query view shows Favorites, Recents and Pages only (F-004.R2). With 32 rows the open took 70–110 ms; with the designed empty state it takes about 20 ms.
- At most 8 results per group and 4 groups; multi-token matching (every token must match).
  - Open (F-004 build): RULE-05, which the palette and the shipped catalog search share, ranks the whole query and says nothing about tokens, so the build follows RULE-05 and does not split the query. Adopting multi-token matching needs a RULE-05 change for both searches.
- Measured: open 19–34 ms, keystroke median 4–5 ms and p95 under 30 ms, with 500 entries.
