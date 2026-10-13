# Design D4 (edge states): audit round 1

0 blockers, 6 majors, 8 minors.

## Fixed
- Every board now has the full CMP-AppShell header (search, theme, settings gear), a skip link, and nav and main landmarks.
- Settings: Reason tweak with all four import reasons; an *importing* busy state; sample file name labeled; the mobile board has all four dialog states.
- Tool view mobile: separate *loading* state, so the hint appears only in *slow*.
- Home mobile: *update ready* and *storage unavailable* states. Home desktop: About link under the intro.
- Catalog no-results: category navigation shown; straight apostrophe as in copy.md.
- CMP-StateMessage spec gains a "page" variant for whole-page states.

## Disagreed
- Mobile tool header with icon-only actions: kept. SCR-ToolView defines labeled icon buttons on narrow screens, and D2 approved it.

## Open (minor)
- Home favorite cards in the edge states have no favorite toggle. They are summarized cards, and the toggle is covered by D1/D2.
- No mobile frames for the catalog and empty-page states; they are the same component at phone width.
