---
id: F-017
title: Read the Owner's résumé
status: building
milestone: M-1
priority: P1
personas: [PER-02]
entities: [ENT-Resume]
rules: [RULE-15]
screens: [SCR-Resume, SCR-About]
components: [CMP-AppShell]
nfr: [NFR-03, NFR-07, NFR-12]
events: []
depends_on: [F-001, F-008]
---

## Intent
A visitor who wants more than the About page can read Taro's career in one place: where they worked, what they studied, and what they're good at (PRN-04).

## Scope
- In: experience, education, skills, languages, certificates and awards from the résumé content; the Résumé page at the portal address `/resume/`; links to it from navigation, About and the palette; its link preview and site-index entry.
- Out: a downloadable PDF; computed durations ("4 years 3 months"), which would go stale between publishes; references and recommendations; editing in the browser.

## Requirements
- **R1** When there is a résumé, the Résumé page shows its sections and entries per RULE-15.
- **R2** Each experience entry shows its role, organization, period, summary and highlights. Each education entry shows its program, institution, level if set, period and notes if set.
- **R3** Each skill shows its name and, if set, its level per RULE-15. Each language shows its name and level. Each certificate and award shows its name or title, issuer and year.
- **R4** When there is a résumé, navigation includes the Résumé page (COPY-nav.resume), the palette's Pages group includes it, and the About page links to it (COPY-about.resume). When there is none (ENT-Resume), the page is not published and nothing links to it.
- **R5** A résumé that breaks the data schema or INV-08 fails the build, naming the file, the entry and the broken rule (F-001.R2). The entry is named by its section and its position in that section, counting from 1 ("experience 3").
- **R6** When there is a résumé, the Résumé page declares a title and description (COPY-meta.resumeTitle, COPY-meta.resumeDescription) with the shared preview image, and the site index lists it (F-015).

## Acceptance criteria
- **AC1** Given a résumé with experience, education and skills but no languages, certificates or awards, when the Résumé page opens, then it shows Experience, Education and Skills in that order and no other section. (R1)
- **AC2** Given experience entries A then B in the résumé, when the page opens, then A is shown before B. (R1)
- **AC3** Given an experience entry "Mentor" at "Rising Stars" from 2022-06 with no end, a summary and two highlights, when the page opens, then it shows the role, organization, "June 2022 – present", the summary and both highlights. (R2)
- **AC4** Given an education entry with level "College" from 2011-09 to 2014-09, when the page opens, then it shows the program, institution, "College" and "September 2011 – September 2014". (R2)
- **AC5** Given a skill "PHP" with level 5 and a skill "Docker" with no level, when the page opens, then PHP shows five filled marks and is read as "5 out of 5", and Docker shows its name only. (R3)
- **AC6** Given the language "English" at level "Advanced", the certificate "Mindfulness" from "Est Rouge" in 2021 and the award "Employee of the Year" from "Green Global" in 2017, when the page opens, then it shows "English" with "Advanced", "Mindfulness" with "Est Rouge" and 2021, and "Employee of the Year" with "Green Global" and 2017. (R3)
- **AC7** Given a résumé, when any portal page opens, then navigation includes Résumé, and the About page links to it. When the palette opens with an empty query, its Pages group includes Résumé. (R4)
- **AC8** Given content without a résumé, or with a résumé that has no entries in any section, when the portal is built, then there is no Résumé page, navigation and the palette don't list it, About has no link to it, and the site index leaves it out. (R4)
- **AC9** Given a third experience entry whose end month is before its start month, when the content is validated, then the build fails, naming the résumé file, "experience 3" and INV-08. (R5)
- **AC10** Given a first education entry with an unknown field, when the content is validated, then the build fails, naming the résumé file, "education 1" and the schema rule it breaks. (R5)
- **AC11** Given a résumé, when the Résumé page's link preview and the site index are read, then the page has COPY-meta.resumeTitle, COPY-meta.resumeDescription and the shared preview image, and the site index lists `/resume/`. (R6)

## UX notes
SCR-Resume. Periods and skill levels follow RULE-15.

## Edge cases
- A current experience (no end) shows "present" (COPY-resume.present).
- A summary or notes with paragraphs keeps its paragraph breaks.
- An experience whose end month is later than today is allowed (a planned end date); it shows that month, not "present".
