---
id: CMP-AppShell
title: App shell
status: draft
tokens: [color.dark.bg, color.dark.bgGlow, color.dark.line, color.dark.fg, color.dark.muted, font.family.display, size.touchTarget]
---

## Purpose
The frame around every portal page: identity, navigation, search, theme and connection status.

## Anatomy
Logo/name (COPY-shell.brand, links home); navigation (Home, Tools, Projects, About, Résumé when there is one, Now; COPY-nav.home, COPY-nav.tools, COPY-nav.projects, COPY-nav.about, COPY-nav.resume, COPY-nav.now); search control with shortcut hint (full: COPY-palette.placeholder with the shortcut as a key cap; compact: COPY-shell.search with the shortcut; narrow: an icon button named COPY-shell.search); theme control; settings link (COPY-nav.settings); offline indicator (COPY-shell.offline); update message (COPY-shell.updateReady); skip link (COPY-shell.skip).

## Variants & states
| Variant / state | Description |
|---|---|
| full | default pages |
| compact | tool view, to leave the most space for the tool |
| narrow | small screens: navigation collapses into a menu (COPY-nav.menu); below 360 px the logo shows its mark only and COPY-shell.brand stays its accessible name, so the bar fits from 320 px (NFR-07) |
| offline | shows the offline indicator |
| update ready | shows the update message (COPY-shell.updateReady) with a refresh action (COPY-shell.refresh); it never reloads by itself |

## Behavior
The current page is marked in navigation. The theme quick toggle switches to the opposite of the theme showing (RULE-03), labeled COPY-shell.themeToggle.

## Accessibility
Landmarks: banner, navigation, main. The skip link comes first. Touch targets per NFR-09.
