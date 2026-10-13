# Design D3: audit round 1

3 blockers, 7 majors and 6 minors. All are fixed and published (canvas version 36).
- Not found rebuilt on the AppShell and CMP-StateMessage. The settings gear is on every desktop header. Every mobile screen has a skip link.
- Type sizes snapped to the scale. New tokens: font.size.input (16), 5xl (44), 6xl (72). Radii snapped.
- Catalog: category pill counts and accessible names, a live result count, 44 px heading links.
- CMP-CategoryTile: hover and regular-focus cells; counts aligned with the catalog (3/2/3/1).
- Projects mobile: per-card ids and the focused card. Now: datetime attributes, data-copy on items, a stale tweak on mobile.
- Settings: System theme option, roving tabindex, privacy panel uses the accent tint instead of a category tint.
- Category mobile in category order. About link names include their destination.
- Not changed: the presentation wrapper colors on component boards (sheet chrome, not UI).

A local copy of the canvas sources is in design/canvas/.

## Round 2 (verification): converged
Every round-1 fix was confirmed. The mechanical checks pass: no doubled units, every type size and radius is on the scale, every COPY ID resolves. One minor was fixed: catalog search inputs now use font.size.input (16 px). Two minors stay open as cosmetic: hard-coded labels in the CategoryTile demo cells, and the live region reusing COPY-category.toolCount, which is intended.
