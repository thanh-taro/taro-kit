---
id: MOD-Shell
title: App shell and base layout
status: draft
depends_on: [MOD-DesignSystem, MOD-Theme, MOD-Offline, MOD-Palette, MOD-Meta, MOD-PersonalData, MOD-ToolHost]
---

## Responsibility
MOD-Shell is the Astro base layout used by every page (CMP-AppShell).
- **Head:**
  - the CSP meta tag (Astro);
  - the theme inline script (MOD-Theme);
  - the head metadata (MOD-Meta);
  - the manifest link and the favicon links (DEP-17, MOD-Offline `FAVICONS`);
  - the font preload, and the catalog data preload (for MOD-Palette and the catalog search, NFR-01).
- **Frame:**
  - the skip link;
  - the banner with name and logo;
  - the navigation, with the current page marked and a collapsed menu on narrow screens; Résumé sits between About and Now only when there is a résumé (`<AppShell resume>`, which `<BaseLayout>` sets from the registry, F-017.R4). With those six items the full bar tightens its items between 721 and 1000 px and shows the icon search control up to 960 px, and the offline indicator is always the notice below the bar instead of the pill in it, so it fits at every width and in every state (NFR-07);
  - the search control showing the shortcut hint (a button marked `data-tk-palette-open`, armed by the palette bootstrap before any island loads; full: the placeholder text and a `data-tk-shortcut` key cap; compact: COPY-shell.search and the key cap; narrow: an icon button named COPY-shell.search; on the narrow tool view the shell bar is hidden and CMP-ToolHeader carries the search icon button);
  - the theme quick toggle;
  - the settings link;
  - the footer (`<footer>`, the contentinfo landmark) after the main content, with links to `/privacy/` (COPY-footer.privacy) and `/terms/` (COPY-footer.terms); the link to the page being shown has `aria-current="page"`. Only the full variant has it; the compact tool view does not (F-018.R3). `<main>` is at least the window's height less the header (`min-height` with `dvh`), so the footer starts below the first screen on every page and late content never moves it in view.
- **Connection and updates:** the quiet offline indicator, and the update-ready message whose refresh action asks MOD-Offline to activate the new version.
- **Storage notice:** when MOD-PersonalData reports device storage unavailable, the one-time notice COPY-storage.unavailable below the header (F-005.R5, SCR-Home error state, ADR-0010): once per browser session (a sessionStorage flag), or once per page if sessionStorage is refused too.
- **Palette:** mounts the palette bootstrap and island (MOD-Palette).
- **Visits:** records the day on every page view and whenever the page is shown or focused again (`connectDayRecording` calls `recordDay`, F-006.R6), so a page left open past midnight records the new day, and installs MOD-ToolHost's linked-visit listener (`connectVisitRecording`, F-006.R1) so cards on any page record a linked tool's visit.
- **Variants:** full, compact (tool view) and narrow.

## Not responsible for
- Page content (MOD-Pages) and the tool area (MOD-ToolHost).
- Service worker logic (MOD-Offline). The shell only shows its signals.

## Public surface
- `<BaseLayout title description path noindex variant="full|compact">` with a default slot; pages pass `{...metaFor(route, registry)}` (MOD-Meta).
- Shell islands: `ShellStatus` (offline indicator and update message), `StorageNotice` and `ThemeToggle`.

## As built (F-019)
- `LanguageSwitch.tsx` is static markup armed by MOD-Language's delegated listener. In the bar it shows the other language's name (both names share one grid cell, so the width does not change between languages); between 721 and 800 px the logo shows its mark only, so the bar fits in both languages. In the narrow menu it is a full-width row with its whole label visible.
- `BaseLayout` takes `titles` (both languages) next to `title` (English, for previews) and runs `language()` and `connectLanguageSwitch()`.
- All shell text (navigation, footer, status, storage notice, theme toggle labels) is rendered through `<L>` or localized attributes.

## Implements
CMP-AppShell; F-017.R4 (navigation); F-011.R3 (indicator) and F-011.R4 (message); F-012.R3 (header toggle); F-004.R1 (visible search control); F-006.R6 (recording); F-018.R3 (footer). It contributes to NFR-04.
