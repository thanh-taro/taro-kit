---
id: MOD-Theme
title: Theme
status: draft
depends_on: [MOD-PersonalData]
---

## Responsibility
MOD-Theme resolves and applies the theme (RULE-03).
- **Before first paint:** a tiny inline, CSP-hashed head script reads the stored preference and sets `data-theme` on the root element, so the first paint is already correct (F-012.R4).
- **After hydration:** it follows the system setting live through `matchMedia('(prefers-color-scheme: light)')`: light only when the device asks for light, otherwise dark. A device with no preference therefore shows dark, as the dark-first style intends (D-019). It also exposes the quick toggle, which flips to the opposite of the theme currently showing and stores that choice explicitly.

## Not responsible for
- Color values (MOD-DesignSystem tokens).
- Where the controls are placed (MOD-Shell, MOD-Pages settings, MOD-Palette action).
- Delivering the theme to embedded tools (MOD-ToolHost does it; it reads `shownTheme`).

## Public surface
- `themeInlineScript`, the build-time source string, so Astro can hash it.
- Signals: `shownTheme` (`light` or `dark`) and `preference` (`system`, `light` or `dark`).
- `setPreference(p)` and `toggle()`.

## Implements
F-012 (all requirements). It contributes to NFR-03 by verifying both themes.
