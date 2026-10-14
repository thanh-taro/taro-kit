---
id: MOD-Shell
title: App shell and base layout
status: draft
depends_on: [MOD-DesignSystem, MOD-Theme, MOD-Offline, MOD-Palette, MOD-Meta, MOD-PersonalData]
---

## Responsibility
MOD-Shell is the Astro base layout used by every page (CMP-AppShell).
- **Head:**
  - the CSP meta tag (Astro);
  - the theme inline script (MOD-Theme);
  - the head metadata (MOD-Meta);
  - the manifest link;
  - the font preload.
- **Frame:**
  - the skip link;
  - the banner with name and logo;
  - the navigation, with the current page marked and a collapsed menu on narrow screens;
  - the search control showing the shortcut hint;
  - the theme quick toggle;
  - the settings link.
- **Connection and updates:** the quiet offline indicator, and the update-ready message whose refresh action asks MOD-Offline to activate the new version.
- **Storage notice:** when MOD-PersonalData reports device storage unavailable, the one-time notice COPY-storage.unavailable below the header (F-005.R5, SCR-Home error state, ADR-0010): once per browser session (a sessionStorage flag), or once per page if sessionStorage is refused too.
- **Palette:** mounts the palette bootstrap and island (MOD-Palette).
- **Visits:** records the day on every page view (`recordDay`, F-006.R6).
- **Variants:** full, compact (tool view) and narrow.

## Not responsible for
- Page content (MOD-Pages) and the tool area (MOD-ToolHost).
- Service worker logic (MOD-Offline). The shell only shows its signals.

## Public surface
- `<BaseLayout title description path variant="full|compact">` with a default slot.
- Shell islands: `ShellStatus` (offline indicator and update message), `StorageNotice` and `ThemeToggle`.

## Implements
CMP-AppShell; F-011.R3 (indicator) and F-011.R4 (message); F-012.R3 (header toggle); F-004.R1 (visible search control); F-006.R6 (recording). It contributes to NFR-04.
