---
id: SCR-Home
title: Home
status: draft
features: [F-007, F-005, F-006, F-004]
components: [CMP-AppShell, CMP-ToolCard, CMP-CommandPalette, CMP-StateMessage, CMP-CategoryTile]
---

## Purpose
Launch pad for the Owner and front door for visitors.

## Layout regions
1. Shell header (CMP-AppShell).
2. Greeting with date and time (COPY-home.greetingMorning / COPY-home.greetingAfternoon / COPY-home.greetingEvening), plus the first-person introduction (COPY-home.intro) linking to About.
3. Search entry that opens CMP-CommandPalette (COPY-palette.placeholder).
4. Favorites (CMP-ToolCard list), shown when not empty (COPY-home.favorites).
5. Recents (at most 8, favorites left out), shown when not empty (COPY-home.recents).
6. Browse by category (COPY-home.categories): CMP-CategoryTile per visible category.
7. What's new, shown when not empty (COPY-home.whatsNew).

## States
| State | When | What the user sees |
|---|---|---|
| default | has favorites or recents | the regions above |
| empty | no favorites and no recents | greeting, search, the first-visit invitation (COPY-home.firstVisit, or COPY-home.firstVisitTouch on touch-only devices) via CMP-StateMessage, browse by category, then what's new |
| loading | n/a | content is local, so there is no loading state |
| error | storage unavailable | the session's favorites and recents, plus a one-time notice (COPY-storage.unavailable) |

## Entry & exit
- Entered from: the portal root, the shell logo, FLOW-01, FLOW-02.
- Exits to: SCR-ToolView, SCR-Catalog, SCR-Category, SCR-About, the palette.

## Accessibility
Reading order follows the region order. The greeting is the main heading. Each section has a heading. The clock is not announced every minute. Meets NFR-03 and NFR-04.
