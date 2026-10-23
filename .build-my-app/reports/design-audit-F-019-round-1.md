# Design audit F-019 (Choose a language), round 1

Scope: git diff of design/canvas (CMP-AppShell, SettingsDesktop/Mobile, PaletteDesktop/Mobile, PolicyDesktop/Mobile, canvas.json) against F-019, CMP-AppShell, SCR-Settings, SCR-Policy, CMP-CommandPalette, copy.md and adapters/design.md. Boards read as source, not rendered.

Counts: blocker 0, major 5, minor 7.

## Verified OK
- COPY IDs and Vietnamese strings match copy.md: nav.*, shell.brand, shell.search, palette.placeholder, policy.updated, policy.translationNote, language.en/vi/device, settings.language, nav.menu.
- Switch accessible name comes from content (visually hidden "Switch to " / "Chuyen sang " plus the visible language name with its own lang), per CMP-AppShell. Present in full, compact, narrow-menu, vi full.
- Touch targets are 44 px (switch height 44, radios min-height 44, menu items 44). No raw colors: all var(--...) except the pre-existing board chrome.
- Settings uses three radios Match my device / English / Tieng Viet with lang on the two names; device is default selected. Policy note appears only with language vi-VN, after the date. canvas.json has no overlaps; naming follows adapter (variant "full · vi-VN", tweaks).
- Vietnamese date "22 thang 10, 2026" matches SCR-Policy.

## Major
| # | File:line | Finding | Spec | Fix |
|---|---|---|---|---|
| M1 | design/canvas/SettingsDesktop.dc.html:94-106; SettingsMobile.dc.html:69-80 | The `language` tweak only moves the radio selection. With vi-VN selected the whole page (header, headings, "Language" legend, "Match my device") stays English, so there is no frame showing settings in Vietnamese. | F-019.AC5, R4; SCR-Settings | Make `language` drive all copy (use the vi column of copy.md for settings, nav and option labels), or add a vi-VN state frame. |
| M2 | design/canvas/PolicyDesktop.dc.html:44-48,76-110; PolicyMobile.dc.html:35-38,65-98 | With language vi-VN only the "Last updated" label, date and note switch. Header nav, title, section headings and footer links stay English. Frame is mixed-language and cannot show R4 or the note in context. | F-019.R4, R6, AC10; SCR-Policy | Drive nav, footer (COPY-footer.privacy/terms vi) and sample content from the tweak; label sample policy text as sample. |
| M3 | design/canvas/PaletteDesktop.dc.html:105; PaletteMobile.dc.html:70 | "language action" frame: English chrome (group "Actions", "Switch to") with Vietnamese query "ngon ngu"; a second visible line 'Also found by "language", "ngon ngu"...' is not a COPY string (no data-copy, design annotation shown as UI). No vi-showing palette frame ("Thao tac", "Chuyen sang English", "3 ket qua" announcement). | F-019.R5, AC19, AC21; adapters/design.md Copy | Move the annotation outside the palette surface (caption) or drop it; add a vi-VN palette state with COPY-palette.groupActions vi, actionLanguage vi (name "English" lang en-US) and a result count. |
| M4 | design/canvas/CMP-AppShell.dc.html:64-103 | Missing frames for AC23/AC20 completeness: compact header in Vietnamese; full layout at its narrowest width in Vietnamese (only the 1264 px bar is shown, so the "header fits" claim is untested); narrow menu open in Vietnamese; narrow vi-VN cell shows the menu closed, so the switch location is not visible at 320 px. No board exists for any of these. | F-019.AC23, AC20, R4; CMP-AppShell "fits from 320 px" | Add cells: compact · vi-VN, full · vi-VN at the narrowest full width (specs set no number; propose one or ask), narrow · menu open · vi-VN at 320 px. |
| M5 | design/canvas/CMP-AppShell.dc.html:79-103 (menu open cell) | AC20 (menu stays open, focus on the switch) is not depicted: no Menu button in expanded state (aria-expanded), no focus ring on the switch, no sign that it kept focus. | F-019.AC20, R2; NFR-04 | Show the Menu button with aria-expanded="true" above the list and the focus ring on the switch. |

## Minor
| # | File:line | Finding | Spec | Fix |
|---|---|---|---|---|
| m1 | design/canvas/CMP-AppShell.dc.html:75,98 | vi theme toggle label is hardcoded "Chuyen sang giao dien sang" with a moon icon in both theme cells; in the light cell it should read "...giao dien toi" (English uses {{t.toggleLabel}}). Also attribute-only label. | COPY-shell.themeToggle | Use the theme-dependent label and icon like the English cells. |
| m2 | design/canvas/PaletteDesktop.dc.html:53,76; PaletteMobile.dc.html:38,55; SettingsDesktop.dc.html:53; SettingsMobile.dc.html:42 | `lang="{{...}}"` renders `lang=""` on every palette row and on the device radio. An empty lang means "unknown language" instead of inheriting. | F-019.R4, AC17 | Render the attribute only when set (`sc-if`) or omit it for non-language rows. |
| m3 | design/canvas/SettingsDesktop.dc.html:48-57; SettingsMobile.dc.html:39-46 | Options are `span role="radio"` in a bare `radiogroup` (no aria-labelledby to the legend). Spec asks for radio buttons; same pattern as theme, so consistent but weak. Mobile 3-col grid wraps "Match my device" to 2 lines at 390 px. | SCR-Settings region 2 | Name the group from the legend; note in the board that these are native radios in code; accept the wrap or stack the options on mobile. |
| m4 | design/canvas/PolicyDesktop.dc.html:44; PolicyMobile.dc.html:35 | In vi the date switches to Manrope but the label "Cap nhat lan cuoi" stays in JetBrains Mono. Two fonts in one line, font choice made per language with no token note. | tokens font roles | Pick one family for the whole line, or state that mono lacks Vietnamese coverage. |
| m5 | design/canvas/SettingsDesktop.dc.html:25-35; SettingsMobile.dc.html:23-26; PolicyDesktop.dc.html:26-38 | Screen headers do not include the language switch (nor search or theme toggle: pre-existing abbreviation), so SCR-Settings and SCR-Policy region 1 do not show F-019.R2's header switch. | F-019.R2; SCR-Settings region 1 | Add the switch to the abbreviated headers or caption them "see CMP-AppShell". |
| m6 | design/canvas/CMP-AppShell.dc.html:38,49,89 etc. | Hidden prefix span is `position:absolute` but the button has no `position:relative`, so the clipped span can anchor to a distant ancestor. | CMP-AppShell a11y note | Add `position:relative` to the button. |
| m7 | design/canvas/CMP-AppShell.dc.html (new cells), Settings/Policy/Palette | Off-grid values 6, 10, 14, 18, 22 px (padding/gap) in new elements, e.g. translation note `padding: 10px 14px`, switch `padding: 0 10px; gap: 6px`. Mostly pre-existing pattern, but adapter says 4-pt grid. | adapters/design.md Tokens | Use 8/12/16 or record the exceptions. |

## Needs a board and has none
- Compact and narrow header width in Vietnamese (M4); the narrowest full-layout width itself is not defined in specs.
- Language switch hover/focus states.
- Settings, Palette and policy pages with Vietnamese showing as complete frames (M1-M3).
- Sample-content lines for the Owner's Vietnamese content (INV-09) have no board; acceptable if sample-labeled.
- No flow (FLOW-*) changes were needed; no broken flow links found.
