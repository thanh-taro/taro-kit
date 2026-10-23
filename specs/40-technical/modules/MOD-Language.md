---
id: MOD-Language
title: Language
status: draft
depends_on: [MOD-PersonalData, MOD-Copy]
---

## Responsibility
MOD-Language resolves and applies the language showing (RULE-16, ADR-0012).
- **Before first paint:** its part of MOD-Theme's blocking inline script, the first element of `<body>`, reads the stored choice, else picks from `navigator.languages`, and sets `lang` and `data-lang` on `<html>` and the page title (F-019.R3).
- **After hydration:** it exposes `shownLanguage` and swaps the localized attributes of static elements on load and on every change.
- **Choosing:** `setLanguage(lang)` stores the choice and applies it; `switchLanguage()` flips to the other language, for the header switch and the palette action.

## Not responsible for
- The strings themselves (MOD-Copy) and the Owner's content (MOD-Content).
- Where the controls are placed (MOD-Shell, MOD-Pages settings, MOD-Palette action).
- Delivering the language to embedded tools (MOD-ToolHost reads `shownLanguage`).

## Public surface
- `languageInlineScript`, the build-time source, merged into MOD-Theme's inline script so one CSP hash covers both.
- The built HTML has `<html lang="en-US" data-lang="en-US">`; the script changes them only when vi-VN is showing.
- Signals: `shownLanguage` (`en-US` or `vi-VN`) and `languageChoice` (`en-US`, `vi-VN` or none).
- `setLanguage(lang)`, `switchLanguage()`, `resolveLanguage(choice, deviceLanguages)` (pure, RULE-16).
- `<L>` (text in both languages) and `localizedAttrs(attr, values)` for static elements.

## Implements
F-019.R1–R4 (with MOD-Copy and MOD-Content); F-019.R7 with MOD-ToolHost. It contributes to NFR-03 by declaring the language of every page and text.
