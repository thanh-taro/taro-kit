# UI critique — F-019 language switch, round 1

Scope: uncommitted changes in `design/canvas/` — CMP-AppShell, SettingsDesktop/Mobile, PaletteDesktop/Mobile, PolicyDesktop/Mobile.
Checked against `specs/30-experience/tokens.json`, `specs/30-experience/copy.md`, F-019, ADR-0012, and the shell CSS in `src/modules/shell/AppShell.astro`.

## How the screenshots were made
`design/canvas/support.js` is not in the repo, so I used a small stand-in runtime (it handles `sc-for`, `sc-if`, `{{…}}`, `renderVals()` and tweaks read from the URL) and rendered copies of the boards with Playwright Chromium and the Google fonts. Screenshots are in `.build-my-app/reports/screens/F-019/`:

- `appshell-board.png` (both themes are on one board)
- `settings-desktop-vi-{dark,light}.png`, `settings-mobile-device-{dark,light}.png`
- `palette-desktop-language-{dark,light}.png`, `palette-mobile-language-{dark,light}.png`
- `privacy-desktop-vi-{dark,light}.png`, `privacy-mobile-vi-{dark,light}.png`
- Fit tests: `fit-header-{721,800,1000}-dark.png` copy the real shell rules for 721–1000 px (column-gap space-3, nav padding-inline space-2, icon search, `.end` gap space-1). `fit-header-721-mark-only-dark.png` shows the proposed fix. `fit-settings-segmented-390-dark.png` shows the Language group in English and in Vietnamese at 390 px.

## Findings (by impact)

1. **Usability: the full header overflows at 721 px (AC23 fails).** CMP-AppShell full. With six nav items, the pill is wider than the room left. Measured bar: 687 px.
   - English showing (pill "Tiếng Việt", 106 px): content is 705 px, 18 px too wide.
   - Vietnamese showing (pill "English", 89 px): content is 712 px, 25 px too wide.

   The Settings gear gets clipped (`fit-header-721-dark.png`). The proposed lighter pill (finding 2) still overflows by 11–18 px.
   **Fix:** for `data-nav='long'` from 721 to 800 px, show only the mark and visually hide the wordmark, using the same rule as `@media (max-width: 359px) .word`. Measured result: it fits in both languages (`fit-header-721-mark-only-dark.png`). At 800 px the current board still has 58–65 px to spare. Add a 721 px artboard to CMP-AppShell in both languages so AC23 can be checked on the board.

2. **Clarity: the pill is the heaviest item in the bar.** CMP-AppShell full and compact.
   - It uses `fg` text, weight 600 and a `line` border. Its neighbours, the theme toggle and settings, are borderless `muted` icons. The bordered pill competes with the search field, which should be the main control in the bar.
   - The `line` border is the decorative hairline (under 3:1). It is neither the `lineStrong` control border nor no border.
   - `gap: 6px` is not on the spacing scale.

   **Fix:** make it a ghost button that matches `tk-iconbtn`:
   - background transparent, `border: 0`, `color.muted`;
   - on hover and when pressed, `color.fg` on `surface2`;
   - `font.size.sm` (13 px), `font.weight.medium`, `radius.md`;
   - `padding-inline: space.2`, icon `size.icon.sm`, gap `space.2`, block size `size.touchTarget`.

   `muted` on `bg` already passes 4.5:1 in both themes.

3. **Usability: in the narrow menu the switch looks like a different kind of control.** CMP-AppShell narrow · menu open.
   - The menu rows are full-width, 15 px, `muted` text with 12 px insets. The switch is a 13 px bordered chip sized to its content, sitting in the bottom-left corner.
   - Its visible text "Tiếng Việt" sits in a list of page links, so it reads like a link to a page called "Tiếng Việt".

   **Fix:** make it a row like the others: `min-height: size.touchTarget`, `padding-inline: space.3`, `font.size.base`, `color.muted`, the globe at `size.icon.sm` with gap `space.2`, and no border. Show the full COPY-shell.languageSwitch text ("Switch to Tiếng Việt" / "Chuyển sang English"). The copy already exists, and the visible text then matches the accessible name. Keep the hairline divider above it.

4. **Usability: the Settings Language group is tight on mobile.** SettingsMobile. Each cell is 101 px wide at 390 px.
   - English: "Match my device" wraps to two lines inside the filled, selected segment, with 4/6 px padding. It looks cramped, and the row rhythm no longer matches the Theme group above.
   - Vietnamese: "Theo thiết bị" fits with about 4 px to spare.
   - At 320 px each cell is about 75 px wide, so "Theo thiết bị" and "Tiếng Việt" will both wrap.

   **Fix:** below 480 px, show the Language radiogroup as one column (`grid-template-columns: 1fr`): each row `min-height: size.touchTarget`, `justify-content: flex-start`, `padding-inline: space.3`, and the same selected fill. Keep Theme as three columns, because its labels are short.

5. **Clarity: the Settings boards can't be used to judge Vietnamese, and parts are out of date.** SettingsDesktop and SettingsMobile.
   - The `language` tweak only moves the selection. Legends, options and body copy stay in English.
   - The header is the old shell, with no search control and no language switch, so the effect of changing the language here doesn't show in the header.
   - The backup note and the privacy callout still use the old copy, without "language". See COPY-settings.backupScope and COPY-settings.privacy.

   **Fix:** make `language: vi-VN` show the Vietnamese copy: Giao diện, Ngôn ngữ, Hệ thống / Sáng / Tối, Theo thiết bị, and so on. Use the current CMP-AppShell header with the switch, and update both texts to match copy.md.

6. **Consistency: the Policy "updated" line in Vietnamese mixes two typefaces.** PolicyDesktop and PolicyMobile, vi-VN. "Cập nhật lần cuối" is in JetBrains Mono while the date is in Manrope. ADR-0012 keeps the mono subset ASCII-only, so in production the accented letters of the label would fall back to a system font.
   **Fix:** in vi-VN, set the whole `COPY-policy.updated` line in `font.family.body`, `font.size.sm`, `font.weight.medium`, `color.muted`. Apply the `:root[data-lang="vi-VN"]` rule to the `<p>`, not only to the `<time>`.

7. **Clarity: the palette language row shows a designer note as its description.** PaletteDesktop and PaletteMobile, "language action" state. The second line reads 'Also found by "language", "ngôn ngữ"… (F-004.R5)'. It sits where Export shows real copy, and it has no COPY id, so it could ship by mistake. Also, the Export description still says "favorites, recents and theme", which no longer matches the backup scope.
   **Fix:** make the row one line (no description), or add description copy through a spec change. Move the note into the board footnote. Update the Export description to include language.

8. **Consistency: the palette uses a different icon for the same action.** In the palette the language action's icon is "Aa", which usually means type or text size. The header uses a globe.
   **Fix:** use the same 16 px globe in the action's tint tile (`tint` background, `accent` colour).

9. **Polish: the switch changes width under the pointer and focus.** The pill shrinks from 106 px to 89 px after switching from English to Vietnamese. Focus stays on it (AC3), so the focus ring and the click area jump, and a second click near its left edge can miss.
   **Fix:** stack both language names in one grid cell, with the inactive name `visibility: hidden` and `aria-hidden`. The button then always has the width of the longer label. Alternatively, set a `min-inline-size` equal to the wider label.

10. **Consistency: the translation note adds a new callout style.** Policy, vi-VN.
    - It uses `surface2` with a 3 px accent stripe on the left, `radius` 7, and 10/14 px padding (off the spacing scale).
    - No other callout in the product has this stripe. The Settings privacy callout uses `tint` with an icon, and the storage notice uses `tint2`, `radius.lg` and `space.3`/`space.4`.

    **Fix:** reuse the Settings privacy callout: `tint` background, `color.fg`, `radius.lg`, padding `space.3 space.4`, a 16 px info icon in `accent`, `font.size.md`, gap `space.3`. Drop the stripe.

11. **Clarity: the Policy vi-VN state is only half translated.** The title "Privacy", the navigation and the headings stay in English, and the header has no language switch. So a Vietnamese display heading can't be checked: "Quyền riêng tư" / "Điều khoản sử dụng" in Unbounded at 44 px (desktop) and 28 px (mobile) with `lineHeight.tight` 1.15, where stacked accent marks (ề, ữ) may be clipped or crowd the line above.
    **Fix:** in the vi-VN state show the Vietnamese title, navigation and header with the switch. If the marks are clipped, raise the h1 line height for `:lang(vi)` to about 1.25.

12. **Usability: the switch has no focus or hover state on the board.** AC3 and AC20 keep focus on the switch, but the CMP-AppShell focus board only shows the skip link and the nav.
    **Fix:** add the switch to the focus board: a `border.width.focus` (2 px) `accent` outline with a 2 px offset, the same as other controls, plus its hover state (from finding 2).

13. **Consistency: the board spacing doesn't match the implementation.** On the board the switch, theme toggle and settings are 20 px apart (the header gap). In the shell they sit in `.end` with `space.1` (4 px).
    **Fix:** draw the switch inside the end cluster with gap `space.1`, so the board and the build match. A 20 px gap would make finding 1 worse.

14. **Clarity (optional, needs a spec change): "Match my device" doesn't say which language is in effect.** With it selected, the user can't tell what they'll get.
    **Fix:** if wanted, add a muted `font.size.sm` line under the group showing the resolved language (new copy). The Theme "System" option has the same gap, so decide for both together.

15. **Accessibility (implementation): the device option renders `lang=""`.** The board passes `lang=""` for "Match my device". An empty `lang` marks the text as an unknown language rather than the page language.
    **Fix:** leave the attribute out for that option. Only English (en-US) and Tiếng Việt (vi-VN) carry `lang`.

## What works and should be kept
- Each language name is written in its own language and marked with `lang`, everywhere: the header, the menu, Settings and the palette. "Switch to" / "Chuyển sang" is visually hidden, so the accessible name contains the visible text (WCAG 2.5.3).
- The 320 px Vietnamese bar (mark, search, theme, Menu) fits, and all targets are 44 px.
- On mobile Settings, the Theme and Language groups use the same three-column grid, so their columns line up. Keep that for Theme if Language becomes one column.
- The palette label composition, "Switch to " plus the marked name, is consistent with the header.
- No contrast problems: every text colour uses pairs listed in `contrast.pairs`.
