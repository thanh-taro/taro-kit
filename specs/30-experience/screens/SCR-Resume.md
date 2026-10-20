---
id: SCR-Resume
title: Résumé
status: draft
features: [F-017]
components: [CMP-AppShell]
---

## Purpose
Read Taro's career at a glance, then in detail.

## Layout regions
1. Shell header.
2. Heading (COPY-resume.title) and intro (COPY-resume.intro).
3. Experience (COPY-resume.experience): a timeline of entries, each with role, organization, period (COPY-resume.period, COPY-resume.present), summary and highlights.
4. Education (COPY-resume.education): entries like experience, with level and notes.
5. Skills (COPY-resume.skills): one block per group, the group's label above its skills as chips that wrap (RULE-15); skills without a group form a last block with no label. A chip shows a level below 5 as COPY-resume.skillLevelShort.
6. Languages (COPY-resume.languages), Certificates (COPY-resume.certificates) and Awards (COPY-resume.awards): short lists of name, then level or issuer and year.

## States
| State | When | What the user sees |
|---|---|---|
| default | a résumé with entries | the sections that have entries, in RULE-15 order |
| empty | no résumé | no page (F-017.R4) |
| loading | n/a | local content |
| error | n/a | — |

## Entry & exit
- Entered from: shell navigation, About (COPY-about.resume), the palette.
- Exits to: SCR-About.

## Accessibility
Sections are headed regions. Periods are machine-readable dates. Each skill group is a list labelled by its group name. The short level is hidden from assistive technology, and the level is given in words (COPY-resume.skillLevel). In the narrow layout (NFR-07) the timeline stacks.
