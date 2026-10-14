---
id: F-005
title: Pin favorite tools
status: shipped
milestone: M-1
priority: P0
personas: [PER-01]
entities: [ENT-Favorite, ENT-PersonalData]
rules: [RULE-02]
screens: [SCR-Home, SCR-Catalog, SCR-ToolView]
components: [CMP-FavoriteToggle, CMP-ToolCard]
nfr: [NFR-05]
events: []
depends_on: [F-001]
---

## Intent
The Owner pins the tools they use most so they are always one step away, on the home page and at the top of the palette (PRN-02). Favorites stay on the device (PRN-03).

## Scope
- In: pinning and unpinning from tool cards and the tool view; the favorites limit; showing favorites in order.
- Out: pinning from the palette, reordering by hand, per-favorite shortcuts (M-2); moving favorites between devices (F-013).

## Requirements
- **R1** The user can pin or unpin any visible tool from its card (on home and in the catalog) and from the tool view. The change shows immediately everywhere the tool appears.
- **R2** Favorites persist on the device across visits and restarts, and are never sent over the network (INV-05).
- **R3** Favorites are listed in pin order. Pinning beyond the visible limit is refused with an explanation (RULE-02, COPY-fav.full).
- **R4** A favorite whose tool is hidden or unknown is not shown and doesn't count toward the limit. While still stored, it reappears if the tool becomes visible again (INV-04, RULE-02).
- **R5** If device storage is unavailable, pinning still works for the session, and a one-time notice explains it won't be remembered (COPY-storage.unavailable).

## Acceptance criteria
- **AC1** Given a tool that is not a favorite, when the user pins it from its card, then its card and the home page show it as a favorite immediately. (R1)
- **AC2** Given a favorite, when the user unpins it in the tool view, then it disappears from the home favorites. (R1)
- **AC3** Given three favorites, when the user closes and reopens the portal, then the same three favorites are shown in the same order. (R2, R3)
- **AC4** Given 24 visible favorites, when the user pins another tool, then it is not pinned and the full-favorites message is shown. (R3)
- **AC5** Given a favorite tool is later hidden, when home loads, then it is not shown; when the tool is visible again, it reappears as a favorite. (R4)
- **AC6** Given 23 visible favorites and 1 stored favorite for a hidden tool, when the user pins a visible tool, then it is pinned, and the hidden tool's favorite is dropped from storage. (R4)
- **AC7** Given device storage is unavailable, when the user pins a tool, then it shows as a favorite for the session and the one-time notice is shown. (R5)

## UX notes
CMP-FavoriteToggle appears on every CMP-ToolCard variant (SCR-Catalog, SCR-Home) and in the tool header (SCR-ToolView). Its label states the current state (COPY-fav.add, COPY-fav.remove). No personal data leaves the device (NFR-05).

## Edge cases
- The same tool is pinned in two open windows. The last write wins, and both windows show the result after their next focus.
