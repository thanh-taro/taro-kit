---
id: F-019
title: Choose a language
status: building
milestone: M-1
priority: P1
personas: [PER-01, PER-02]
entities: [ENT-Preferences, ENT-CatalogEntry, ENT-Category, ENT-Profile, ENT-Resume, ENT-NowNote, ENT-Policy]
rules: [RULE-16, RULE-08, RULE-15, RULE-05]
screens: [SCR-Settings, SCR-ToolView, SCR-Policy]
components: [CMP-AppShell, CMP-CommandPalette]
nfr: [NFR-03, NFR-05, NFR-06, NFR-11]
events: []
depends_on: [F-012, F-001]
---

## Intent
Visitors and the Owner can read the whole portal in English or Vietnamese, and switch at any moment without losing their place (PRN-04). Embedded tools are told the language, so a tool can match the portal the way it already matches the theme (D-060 to D-063).

## Scope
- In: the two languages of RULE-16 (English, en-US, and Vietnamese, vi-VN); the first-visit language taken from the device; choosing in settings, a quick switch in the shell header and a palette action; remembering the choice; every portal text in the language showing, both the portal's own text (copy) and the Owner's content (catalog, categories, profile, résumé, Now, policies); dates in the language showing; telling an embedded tool which language is showing.
- Out: other languages; a separate address per language (D-062): link previews and the site index stay in English; translating a tool's own interface (each tool does that itself, guided by the tool contract); following a device language change while a page is open.

## Requirements
- **R1** The portal shows one language at a time, en-US or vi-VN. With no stored choice, the language showing is picked from the device as each page opens (RULE-16).
- **R2** Settings offers both languages and following the device (COPY-settings.language; options COPY-language.en, COPY-language.vi, COPY-language.device); following the device removes the stored choice. The shell header has a quick switch to the other language (COPY-shell.languageSwitch), and the palette has a switch-language action (COPY-palette.actionLanguage). Each stores the choice, and the change applies immediately to everything on the page, with no reload and no loss of state: scroll position, focus, text typed in a search field, open menus and an open tool are kept.
- **R3** The chosen language persists on the device, and the page never shows the other language while loading.
- **R4** Every text the portal shows is in the language showing: copy, the Owner's content (INV-09), accessible names and descriptions, announcements, the page title shown by the browser, and dates and times, which use that language's conventions (RULE-15, RULE-16). The page declares the language showing, and text in another language (the language names in the language controls) is marked with its own language.
- **R5** Search in the palette and the catalog matches tools, pages and actions by their text in both languages, so a tool can be found by its English or its Vietnamese name, summary or tags; results are shown in the language showing (RULE-05).
- **R6** On the Privacy and Terms pages, when Vietnamese is showing, a note says the Vietnamese text is a translation and the English text applies if they differ (COPY-policy.translationNote, D-063). With English showing there is no note.
- **R7** When the portal shows an embedded tool, it tells the tool the language showing (en-US or vi-VN) as it opens the tool, and again whenever the language changes, so the tool can match it without reloading. It follows F-012.R5 and F-012.R6: only that tool's own address receives it, the tool's ready message is answered with the language too, and linked tools and the open-in-new-tab address never carry it.
- **R8** Link previews (F-015), the site index and the installed app's name and description are in English, whatever language a visitor chooses. A page opened with no script shows English.

## Acceptance criteria
- **AC1** Given no stored language and a device whose preferred languages are vi, then en, when Home opens, then Home is in Vietnamese and declares vi-VN. (R1)
- **AC2** Given no stored language and a device whose preferred languages are fr, then de, when Home opens, then Home is in English and declares en-US. (R1)
- **AC3** Given English is showing on the Tools page with "json" typed in the filter and the page scrolled down, when the user picks Tiếng Việt in the header switch, then the page heading, tool summaries, filter placeholder, navigation and footer show in Vietnamese, the filter still holds "json" with the same results, switching does not move the page (the scroll position is what it was when the switch was activated), focus stays on the switch, and the page did not reload. (R2, R4)
- **AC4** Given Vietnamese was chosen, when the portal reloads on any page, then the first painted screen is already Vietnamese. (R3)
- **AC5** Given English is showing, when the user picks Tiếng Việt in settings, then settings and the shell show in Vietnamese immediately and the stored choice is vi-VN. (R2)
- **AC6** Given Vietnamese is showing, when the user runs the switch-language action in the palette, then English is showing and the palette closes. (R2)
- **AC7** Given Vietnamese is showing, when the Résumé page opens, then section headings and summaries are Vietnamese, a period from 2022-06 with no end reads "tháng 6 năm 2022 – nay", and the browser's page title is "CV — TaroKit". (R4)
- **AC8** Given Vietnamese is showing, when Home opens on Friday 2026-10-23 at 08:00 local time, then the greeting is "Chào buổi sáng", the date reads "Thứ 6, 23 thg 10" and the time reads "8:00". (R4)
- **AC9** Given a tool whose English summary contains "format" and whose Vietnamese summary contains "định dạng", when the user types "dinh dang" in the palette with English showing, then the tool is listed, shown with its English name and summary. (R5)
- **AC10** Given Vietnamese is showing, when the Privacy page opens, then the translation note is shown near the title; given English is showing, then it is not. (R6)
- **AC11** Given Vietnamese is showing, when an embedded tool opens, then the tool's address carries vi-VN and the theme showing. (R7)
- **AC12** Given an embedded tool is showing, when the user switches to English, then the tool receives en-US without reloading, nothing else is sent, and the frame is not reloaded. (R7)
- **AC13** Given an embedded tool is loading, when it says it is ready, then the portal sends it the language showing and the theme showing; when the ready message comes from any other address, or from a window that is not this tool's frame, then the portal sends nothing. (R7)
- **AC14** Given Vietnamese is showing, when the user opens a linked tool or uses open-in-new-tab on an embedded tool, then the address opened carries no language. (R7)
- **AC15** Given the built portal, when the Home page's link preview, the site index and the app manifest are read, then they are in English, and each page's address is the same as before this feature; when Home opens with scripts disabled, then only the English text is shown. (R8)
- **AC16** Given Vietnamese is showing and one online visit, when the device is offline and the Now page opens, then it is in Vietnamese. (R3, R4)
- **AC17** Given Vietnamese is showing, when the automated accessibility audit runs on every portal page, then it reports zero serious issues, and the language controls mark "English" as en-US and "Tiếng Việt" as vi-VN. (R4)
- **AC18** Given a tool entry with no Vietnamese summary, when the content is validated, then the build fails and the error names the file, the entry, the field and INV-09. (R4, F-001.R2)
- **AC19** Given Vietnamese is showing, when the user types "settings" in the palette, then the page Cài đặt is listed; when the user types "ngôn ngữ", "language" or "english", then the switch-language action is listed. (R5)
- **AC20** Given the narrow layout with the menu open, when the user switches language from the menu, then the menu stays open with focus on the switch. (R2)
- **AC21** Given Vietnamese is showing, when the palette shows 3 results, then "3 kết quả" is announced. (R4)
- **AC22** Given device storage is unavailable and a device preferring English, when the user switches to Tiếng Việt, then the page is Vietnamese; when another page opens, then it is English again. (R3)
- **AC23** Given Vietnamese is showing, when any portal page is shown at 320 px and at 721 px (the narrowest full layout), then the header fits with no horizontal scrolling. (R4)
- **AC24** Given Vietnamese was chosen, when the user picks COPY-language.device in settings on a device preferring English, then English is showing and no language is stored. (R2)

## UX notes
The quick switch lives in CMP-AppShell's header next to the theme toggle (inside the menu on the narrow layout); the full choice is in SCR-Settings, Appearance; the palette action is in CMP-CommandPalette's Actions group. Telling tools the language happens in SCR-ToolView and has no visible UI. Language names are always written in their own language (COPY-language.en, COPY-language.vi), so a visitor can find theirs whatever is showing. Switching must not move focus or announce anything beyond the control's own new state.

## Edge cases
- Device storage is unavailable. The language follows the device, and a choice lasts only until the page changes (AC22).
- Another open window of the portal switches too, as soon as it is shown again, as it does for the theme.
- The Vietnamese policies are approved by the Owner before release, as the English text was (D-057).
- A backup file from before this feature has no language. Import keeps the language following the device (RULE-08).
- A tool that ignores the language parameter and messages is unaffected; it shows in its own language.
- Text the Owner writes once for both languages (names, INV-09) shows the same in both, marked with the language showing.
- The Owner's content quotes English words inside Vietnamese text (product names, "JSON"). They stay as written.
