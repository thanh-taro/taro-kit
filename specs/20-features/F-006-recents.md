---
id: F-006
title: Track recent tools
status: ready
milestone: M-1
priority: P0
personas: [PER-01]
entities: [ENT-RecentVisit, ENT-PersonalData]
rules: [RULE-01, RULE-13]
screens: [SCR-Home, SCR-Settings]
components: []
nfr: [NFR-05]
events: []
depends_on: [F-003]
---

## Intent
The portal remembers which tools were opened lately, so returning to yesterday's tool takes no searching (PRN-02). It also counts the days the portal was used, so the Owner can see whether TaroKit is really their daily launcher.

## Scope
- In: recording a visit when a tool is opened; the recents list; clearing recents; the days-used count.
- Out: other usage statistics; any analytics (none, PRN-03).

## Requirements
- **R1** A visit is recorded when an embedded tool's view is shown for a visible tool, whether or not the tool loads, or when a linked tool's own address is opened. Showing the linked note or the not-found state records nothing.
- **R2** Recents follow RULE-01: newest first, one entry per tool, at most 20 stored.
- **R3** Recents persist on the device and are never sent over the network (INV-05).
- **R4** The user can clear all recents from settings after confirming (COPY-settings.clearRecentsConfirm).
- **R5** Recents for hidden or unknown tools are not shown and, while still stored, reappear if the tool becomes visible again (INV-04).
- **R6** Each local day the portal is opened is recorded (RULE-13), and settings shows the days used in the last 14 days (COPY-settings.daysUsed).

## Acceptance criteria
- **AC1** Given a linked tool, when the user opens it from a card, then it appears first in recents. (R1)
- **AC2** Given an embedded tool, when its tool view is shown, then it appears first in recents. (R1)
- **AC3** Given a linked tool, when the user visits its portal address directly and does not follow the link, then recents are unchanged. (R1)
- **AC4** Given recents A, B and C (newest first), when the user opens C, then the order becomes C, A, B with no duplicate. (R2)
- **AC5** Given 20 stored recents, when the user opens a new tool, then the new tool is first and the oldest entry is gone. (R2)
- **AC6** Given recents exist, when the user reloads the portal, then the same recents are shown. (R3)
- **AC7** Given recents exist, when the user confirms clear-recents in settings, then the recents list is empty. (R4)
- **AC8** Given a recent tool is hidden, when home loads, then it is not listed; when it becomes visible again, then it is listed in its original position. (R5)
- **AC9** Given the portal was opened on 3 distinct days in the last 14, and on others before that, when settings opens, then it shows 3 days used. (R6)

## UX notes
Recents show on SCR-Home and in the palette's empty-query view. Clearing and days used are in SCR-Settings. Privacy follows NFR-05.

## Edge cases
- The device clock moves backward. Dates are recorded as they are; a duplicate date is not added twice.
