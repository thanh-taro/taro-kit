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

## Implements
F-004 (all requirements) and F-007.R2. It is the main owner of NFR-02, and contributes to NFR-04.

## Normative from spike SP-6
- The empty-query view shows Favorites, Recents and Pages only (F-004.R2). With 32 rows the open took 70–110 ms; with the designed empty state it takes about 20 ms.
- At most 8 results per group and 4 groups; multi-token matching (every token must match).
- Measured: open 19–34 ms, keystroke median 4–5 ms and p95 under 30 ms, with 500 entries.
