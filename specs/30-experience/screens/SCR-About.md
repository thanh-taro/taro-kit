---
id: SCR-About
title: About
status: draft
features: [F-008]
components: [CMP-AppShell]
---

## Purpose
Show who Taro is and how to reach them.

## Layout regions
1. Shell header.
2. Avatar, name, headline, location.
3. Bio.
4. Links (COPY-about.links).
5. Pointers to Projects and Now (COPY-about.more).

## States
| State | When | What the user sees |
|---|---|---|
| default | profile present | everything above |
| empty | n/a | a profile is required by the build |
| loading | n/a | local content |
| error | n/a | — |

## Entry & exit
- Entered from: the home introduction, shell navigation, the palette, FLOW-02.
- Exits to: SCR-Projects, SCR-Now, external links.

## Accessibility
The avatar has alt text naming the person. Links state where they go, for example "GitHub profile (opens in new tab)".
