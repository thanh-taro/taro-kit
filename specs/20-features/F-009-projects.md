---
id: F-009
title: Showcase projects
status: ready
milestone: M-1
priority: P1
personas: [PER-02]
entities: [ENT-Project]
rules: [RULE-06]
screens: [SCR-Projects]
components: [CMP-ProjectCard, CMP-StateMessage]
nfr: []
events: []
depends_on: [F-001]
---

## Intent
Visitors see what else Taro has built beyond the tools (PRN-04).

## Scope
- In: a list of visible projects with description, image, tags, year and links; an address per project.
- Out: case-study pages per project (not planned).

## Requirements
- **R1** The projects page lists every visible project, newest year first, then by name.
- **R2** Each project shows its name, summary, description, tags, year, image if set, and its links. Links open in a new tab.
- **R3** With no visible projects, the page shows an empty state (COPY-projects.empty).
- **R4** Each visible project has a stable address on the projects page built from its id. Visiting it brings that project's card into view and focuses it.

## Acceptance criteria
- **AC1** Given projects from 2024 and 2026, when the page opens, then the 2026 project is listed first. (R1)
- **AC2** Given a hidden project, when the page opens, then it is not listed. (R1)
- **AC3** Given a project with two links, when the visitor activates one, then it opens in a new tab. (R2)
- **AC4** Given no visible projects, when the page opens, then the empty state is shown. (R3)
- **AC5** Given a project "unity-game" further down the page, when the visitor opens its address, then its card is scrolled into view and focused. (R4)

## UX notes
SCR-Projects with CMP-ProjectCard; the empty state uses CMP-StateMessage.

## Edge cases
- A project without an image shows a neutral placeholder built from its name.
- An address for an unknown or hidden project opens the projects page at the top.
