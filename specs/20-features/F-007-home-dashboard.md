---
id: F-007
title: Home dashboard
status: ready
milestone: M-1
priority: P0
personas: [PER-01, PER-02]
entities: [ENT-Profile, ENT-Tool, ENT-Category]
rules: [RULE-01, RULE-04, RULE-14, RULE-16]
screens: [SCR-Home]
components: [CMP-ToolCard, CMP-CommandPalette, CMP-CategoryTile]
nfr: [NFR-01, NFR-11]
events: []
depends_on: [F-004, F-005, F-006, F-016]
---

## Intent
Home is the launch pad for the Owner and the front door for visitors. It is lean: a greeting, one obvious way to search, your tools, and what's new (PRN-02, PRN-04).

## Scope
- In: greeting with date and time, the search entry, favorites, recents, the browse-by-category row, what's new, a short introduction linking to About.
- Out: widgets such as weather or featured tools (not planned for M-1).

## Requirements
- **R1** Home shows a greeting suited to the local time of day (COPY-home.greetingMorning 05:00–11:59, COPY-home.greetingAfternoon 12:00–17:59, COPY-home.greetingEvening otherwise). It also shows the local date and time in the conventions of the language showing (RULE-16). Greeting and time update on the minute.
- **R2** Home offers a prominent search entry that opens the command palette.
- **R3** Home shows favorites, then recents per RULE-01 (at most 8, favorites left out). Each section appears only when it has items.
- **R4** Home shows "what's new" per RULE-04, only when it has items.
- **R5** Home shows a short first-person introduction from the Owner (nickname if set, otherwise full name, plus headline; COPY-home.intro) linking to the About page.
- **R6** With no favorites and no recents, home invites the user to explore the catalog, mentioning the shortcut on devices with a keyboard (COPY-home.firstVisit) and not on touch-only devices (COPY-home.firstVisitTouch).
- **R7** Home shows a "browse by category" row (COPY-home.categories) with one tile per visible category, in category order: icon, tint, name and number of visible tools (RULE-14, COPY-category.toolCount, COPY-category.toolCountOne). Each tile opens the category page (F-016).
- **R8** On home, every tool name in favorites, recents and what's new shows on one line (CMP-ToolCard sizing); a name too long for its space is shortened with an ellipsis and shows in full on hover.

## Acceptance criteria
- **AC1** Given the local time is 08:30, when home opens, then the morning greeting and the current date and time are shown. (R1)
- **AC2** Given the local time is 11:59:30, when 30 seconds pass, then the afternoon greeting and 12:00 are shown without a reload. (R1)
- **AC3** Given home is open, when the user activates the search entry, then the command palette opens. (R2)
- **AC4** Given two favorites and no recents, when home opens, then the favorites section shows two tools and no recents section is shown. (R3)
- **AC5** Given 12 recents of which 2 are favorites, when home opens, then the recents section shows 8 tools, none of them favorites. (R3)
- **AC6** Given one tool added 3 days ago and one added 60 days ago, when home opens, then what's new lists only the first. (R4)
- **AC7** Given 8 tools added within the last 30 days, when home opens, then what's new lists the 6 newest. (R4)
- **AC8** Given a tool added 10 days ago and updated 2 days ago, when home opens, then what's new lists it once, as updated, ranked by the 2-day date. (R4)
- **AC9** Given a profile, when home opens, then the Owner's name and headline are shown with a link to About. (R5)
- **AC10** Given no favorites and no recents on a device with a keyboard, when home opens, then the invitation with the shortcut is shown; on a touch-only device, the touch invitation is shown. (R6)
- **AC11** Given visible tools in Developer tools (3) and Media tools (1) and none in the other categories, when home opens, then the category row shows two tiles, \"Developer tools · 3 tools\" then \"Media tools · 1 tool\", each with its icon and tint, and activating one opens its category page. (R7)
- **AC12** Given a recent tool and a new tool each named "An Extremely Long Tool Name For Testing", when home opens at 390 px and at 1280 px wide, then each name takes one line, ends in an ellipsis where it does not fit, and the card or row shows the full name on hover; the link's accessible name is the full name. (R8)

## UX notes
SCR-Home. Tool lists use CMP-ToolCard. The search entry opens CMP-CommandPalette. Load speed and weight: NFR-01, NFR-11.

## Edge cases
- The device's time zone changes while home is open. The next minute's update uses the new zone.
