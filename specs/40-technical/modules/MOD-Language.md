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

## As built (F-019)
In `src/modules/language/`.
- `languages.ts`: `LANGUAGES`, `Lang`, `Loc` (both versions), `Text` (a string the same in both, or a `Loc`), and the pure helpers `pick`, `both`, `shared`, `mapText`, `versions`, `otherLanguage`, `isLang`.
- `index.ts`: `createLanguage({ store, device, doc? })` returns `{ choice, shownLanguage, setLanguage, switchLanguage, dispose }` over MOD-PersonalData's stored `preferences.language`. `language()` is the page's shared instance. `applyLanguage(doc, lang)` sets `lang`/`data-lang` on `<html>`, the title and every localized attribute. `connectLanguageSwitch()` is one delegated click listener for every `[data-tk-language-switch]` control, so the switches work before any island hydrates and focus stays on them.
- Markup (ADR-0012):
  - A text in both languages renders one element per language, marked `lang` + `data-l=""`. A global CSS rule hides the one not showing. A text that is the same in both renders once, unmarked.
  - `<L>` renders a text. `<Each render={(lang) => …}>` renders any markup per language. Both come as `L.tsx` for islands and `L.astro`/`Each.astro` for pages.
  - `localizedAttrs(attr, text, showing)` gives the attribute in the language showing, `data-l-a` (the localized attribute names) and `data-l-<attr>-<lang>` for each version. `swapLocalizedAttributes` swaps them.
  - The page title carries `data-l-en-US` / `data-l-vi-VN`.
- Islands: `useShownLanguage()` starts at en-US (the server render) and follows `shownLanguage` after hydration. It is used only for text made at run time (results, counts, messages); static text uses `<L>`, so a switch is CSS only. Announcements read the language through a ref, so a switch announces nothing.
- `.tk-mono-words` (global.css): mono word lines (dates, labels) use the body face while Vietnamese shows, since the mono subset is ASCII. `scripts/check-dist-fonts.ts` checks that every display and mono text in both languages is covered by the shipped subsets.
- The header switch is MOD-Shell's `LanguageSwitch.tsx` (static markup, in the bar and as a row in the narrow menu); the settings choice is MOD-Pages' `LanguageChoice.tsx`.

## Implements
F-019.R1–R4 (with MOD-Copy and MOD-Content); F-019.R7 with MOD-ToolHost. It contributes to NFR-03 by declaring the language of every page and text.
