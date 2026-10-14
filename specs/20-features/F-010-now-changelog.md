---
id: F-010
title: Now and changelog
status: shipped
milestone: M-1
priority: P1
personas: [PER-02, PER-01]
entities: [ENT-NowNote, ENT-Tool]
rules: [RULE-04, RULE-09]
screens: [SCR-Now]
components: [CMP-StateMessage]
nfr: []
events: []
depends_on: [F-001]
---

## Intent
Visitors see what Taro is focused on now and how the toolkit has grown. The changelog stays honest without extra work because it is built from catalog dates (PRN-04).

## Scope
- In: the Now note with its last updated date and staleness label; a changelog of tool additions and updates.
- Out: hand-written release notes per tool (each tool's own project); history of earlier updates (only the latest updated date is kept per tool).

## Requirements
- **R1** The Now page shows the Now note and its last updated date (RULE-09, COPY-now.updated).
- **R2** If the Now note is more than 90 days old on the viewer's current date, it is labeled as possibly out of date (RULE-09, COPY-now.stale).
- **R3** The changelog lists at most one added and one updated item per visible tool, newest first, grouped by month (RULE-04). Each item links to the tool.
- **R4** With no Now note, only the changelog is shown. With neither a note nor any visible tools, an empty state is shown (COPY-now.empty).

## Acceptance criteria
- **AC1** Given a Now note updated 10 days ago, when the page opens, then the note and its date are shown without a stale label. (R1)
- **AC2** Given a Now note updated 120 days ago, when the page opens, then the possibly-out-of-date label is shown. (R2)
- **AC3** Given a Now note updated 89 days ago, when the page is viewed 2 days later with no new publish, then the stale label is shown. (R2)
- **AC4** Given a tool added in March and updated in May, when the page opens, then it appears in the May group as updated and in the March group as added, May first. (R3)
- **AC5** Given no Now note and two visible tools, when the page opens, then only the changelog is shown. (R4)
- **AC6** Given no Now note and no visible tools, when the page opens, then the empty state is shown. (R4)

## UX notes
SCR-Now holds both sections. Changelog labels: COPY-now.changelogAdded, COPY-now.changelogUpdated. The empty state uses CMP-StateMessage.

## Edge cases
- A tool added and updated on the same day appears only as added.
- A Now note with no visible tools shows only the note: the changelog has no items (RULE-04), so its section is left out.
