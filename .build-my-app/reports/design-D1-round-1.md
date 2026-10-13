# Design D1 (components): audit round 1

Auditor: design-auditor. 13 majors, about 12 minors.

## Fixed
- Touch targets ≥ 44 px: nav links, search (full and compact), palette rows, tool header "open in new tab".
- CMP-AppShell: added a skip-link and focus-ring cell; the theme-toggle label is now per theme ("Switch to dark theme" in light); added the `chrome` token to tokens.json.
- CMP-ToolHeader: favorite toggle added to the slow variant; data-copy on Back and Open; radius set to 10 (radius.md).
- CMP-ToolCard: the whole card is the link (stretched link, favorite button above it); an unavailable cell for both a linked tool and a non-offline-capable embedded tool; the linked marker kept on the unavailable linked card; data-copy on compact toggles.
- CMP-ProjectCard: links carry hidden "(opens in a new tab)" text (COPY-tool.opensNewTab); cell labels prefixed.
- CMP-CommandPalette: footer hints read Enter / Esc, as in COPY-palette.hints.
- CMP-FavoriteToggle: cell labels prefixed.

## Disagreed (adapter amended instead)
- Token variable naming. Artboards show both themes side by side, so they use short role variables scoped to `.tk-dark` / `.tk-light`, with values equal to tokens.json. The `--tk-*` names apply to generated code. adapters/design.md now says this.

## Deferred (minor)
- Palette shown over a scrim; focus ring on palette rows; hover cell for the favorite toggle. These fold into D2, where the palette appears over Home.
- data-copy on page rows and on relative-time hints in the palette (sample data).
