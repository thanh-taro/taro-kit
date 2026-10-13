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

## Round 2 (verification)
- Correction: round 1 said every board had the full header. ToolStatesDesktop did not. It now uses the CMP-AppShell **compact** variant approved in D2 (logo, search, theme toggle, plus the offline pill), and a mechanical check confirms balanced markup and toggleLabel in use.
- ToolStatesMobile has no shell header, by design: on narrow screens the tool header replaces it (SCR-ToolView).
- Minors left open: decorative glyphs (logo "T", ⌘K) without data-copy; sample values (file name, date) are labeled but have no marker attribute.
- Verdict: converged.
