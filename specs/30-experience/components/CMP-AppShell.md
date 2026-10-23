---
id: CMP-AppShell
title: App shell
status: draft
tokens: [color.dark.bg, color.dark.bgGlow, color.dark.line, color.dark.fg, color.dark.muted, font.family.display, size.touchTarget]
---

## Purpose
The frame around every portal page: identity, navigation, search, theme, language and connection status.

## Anatomy
Logo/name (COPY-shell.brand, links home); navigation (Home, Tools, About, Résumé when there is one, Now; COPY-nav.home, COPY-nav.tools, COPY-nav.about, COPY-nav.resume, COPY-nav.now); search control with shortcut hint (full: COPY-palette.placeholder with the shortcut as a key cap; compact: COPY-shell.search with the shortcut; narrow: an icon button named COPY-shell.search); theme control; language switch (COPY-shell.languageSwitch; F-019.R2); settings link (COPY-nav.settings); offline indicator (COPY-shell.offline); update message (COPY-shell.updateReady); skip link (COPY-shell.skip); footer with links to the Privacy and Terms pages (COPY-footer.privacy, COPY-footer.terms; F-018).

## Variants & states
| Variant / state | Description |
|---|---|
| full | default pages; from 721 to 800 px wide the logo shows its mark only (COPY-shell.brand stays its accessible name), so the bar with the language switch fits in both languages (NFR-07, F-019.AC23) |
| compact | tool view, to leave the most space for the tool; no footer |
| narrow | small screens: navigation collapses into a menu (COPY-nav.menu), which also holds the language switch as a full-width row with the whole COPY-shell.languageSwitch text; below 360 px the logo shows its mark only and COPY-shell.brand stays its accessible name, so the bar fits from 320 px (NFR-07) |
| offline | shows the offline indicator |
| update ready | shows the update message (COPY-shell.updateReady) with a refresh action (COPY-shell.refresh); it never reloads by itself |

## Behavior
The current page is marked in navigation and, for the Privacy and Terms pages, in the footer. The footer sits after the page content, and the content area fills at least the window's height, so the footer starts below the first screen and content that appears late (what's new on Home) never moves it in view. The theme quick toggle switches to the opposite of the theme showing (RULE-03), labeled COPY-shell.themeToggle. The language switch's visible text is the other language's name, marked with its language (COPY-language.en or COPY-language.vi). Its accessible name comes from its content, never an attribute-only label: COPY-shell.languageSwitch with the prefix visually hidden and {language} as the marked visible name. It switches to that language (F-019.R2) and keeps focus. It looks like the theme toggle (borderless, muted until hovered or focused) and keeps a stable width when its label changes. In Vietnamese the header still fits from 320 px (NFR-07).

## Accessibility
Landmarks: banner, navigation, main, contentinfo (the footer). The skip link comes first. Touch targets per NFR-09.
