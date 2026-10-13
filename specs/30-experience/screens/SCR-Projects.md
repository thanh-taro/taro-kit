---
id: SCR-Projects
title: Projects
status: draft
features: [F-009]
components: [CMP-AppShell, CMP-ProjectCard, CMP-StateMessage]
---

## Purpose
Show what else Taro has built.

## Layout regions
1. Shell header.
2. Title (COPY-projects.title).
3. CMP-ProjectCard list. Each card has its own address on this page (F-009.R4).

## States
| State | When | What the user sees |
|---|---|---|
| default | projects exist | cards |
| empty | none visible | CMP-StateMessage with COPY-projects.empty |
| loading | n/a | local content |
| error | n/a | — |

## Entry & exit
- Entered from: About, the palette, shell navigation, FLOW-02.
- Exits to: project links.

## Accessibility
Each card is a list item with a heading.
