# Design audit F-019 (Choose a language), round 2

Method: boards read as source plus scripted checks (COPY IDs and Vietnamese strings against copy.md, hex values against tokens.json, empty lang attributes, 44 px heights, canvas.json overlaps), and the round-2 renders in .build-my-app/reports/screens/F-019/round-2/ (appshell board, settings, palette, privacy and terms in en and vi, both themes) were viewed. Specs checked: CMP-AppShell, SCR-Settings, F-019.AC23 as changed this round.

Counts: blocker 0, major 0, minor 3. Round-1 items: M1-M5 and m1-m7 all resolved (minor residue noted below).

## Round-1 resolution
| Item | Status | Evidence |
|---|---|---|
| M1 Settings vi | Resolved | settings-*-vi renders: all copy Vietnamese (Hiển thị, Giao diện, Ngôn ngữ, Theo thiết bị, daysUsed, backupScope, three privacy paragraphs equal copy.md vi). "device" shows English (stated device assumption). |
| M2 Policy vi | Resolved | privacy-desktop-vi: nav, title "Quyền riêng tư", header switch "English", date "Cập nhật lần cuối 22 tháng 10, 2026", note, footer vi; sample content labelled sample. |
| M3 Palette vi | Resolved | palette-*-language-vi: "Thao tác", "Chuyển sang English", hints text equals COPY-palette.hints vi; annotation moved to a board note; count is sr-only role=status with resultCount/resultCountOne. |
| M4 Missing cells | Resolved | AppShell board: compact vi, 721 en and vi (bar 689 = 721 less 2x16 gutter, matches AC23), narrow 320 vi, menu open en 390 and vi 320. |
| M5 Menu-open | Resolved | Menu aria-expanded true, focus ring on switch row in the vi cell. |
| m1 vi theme label | Resolved (see n1) | label follows theme (sáng in dark, tối in light). |
| m2 lang="" | Resolved | 0 `lang=""`; remaining `lang="{{..}}"` templates sit inside sc-if branches. |
| m3 radiogroup | Resolved | aria-labelledby per group; mobile Language stacks in one column (SCR-Settings "below 480 px"). |
| m4 policy line font | Resolved | vi line is Manrope throughout. |
| m5 screen headers | Resolved | desktop headers carry the switch; mobile headers show Menu, switch lives in the menu (spec). |
| m6 position:relative | Resolved | all switch buttons have it. |
| m7 4-pt values | Resolved for new elements | switch 0 8/gap 8, note 12/16. |

## Checks on the fixes
- Copy: every data-copy element with literal text matches en or vi of its ID; no unknown COPY IDs in any board. All Vietnamese strings not tied to a COPY ID are sample content (tool summaries, headline, policy sample, greeting date), labelled as sample.
- Switch markup: hidden prefix class sr (COPY-shell.languageSwitch prefix), visible name with lang en-US or vi-VN and its COPY-language ID; the inactive name is aria-hidden and visibility hidden for stable width. Accessible name comes from content, as the spec requires.
- Tokens: only non-token hex is #0B0810, the pre-existing outer board backdrop in CMP-AppShell. Radii 7/10/12, spacing on 4-pt for new elements.
- 44 px: no button, link or radio below 44 px.
- canvas.json: 0 overlaps; CMP-AppShell h 3620 matches the board.
- Naming follows adapters/design.md (`CMP-AppShell / narrow · menu open · vi-VN / dark`, tweaks for language).

## Minor
| # | File | Finding | Spec | Fix |
|---|---|---|---|---|
| n1 | design/canvas/CMP-AppShell.dc.html (vi cells, theme toggle) | The dark cell label says "Chuyển sang giao diện sáng" but the icon is a moon (the glyph for going dark). Same board-wide glyph in the English cells (pre-existing), so consistent, but wrong in both languages. | COPY-shell.themeToggle | Show a sun icon when the label offers light. |
| n2 | Settings, Palette, Policy boards (board note lines inside frames) | Mono annotation text sits inside the screen frame, with no COPY ID. Captioned as board notes and ASCII only; acceptable, but a developer could take them for UI. | adapters/design.md Copy | Move notes outside the frame or keep the "Board note:" prefix on all of them (Palette and Policy notes lack it). |
| n3 | Palette boards | The announced result count (AC21) is sr-only, so it has no visible UI; only a note describes it. | F-019.AC21 | Accept, or caption the frame with the announced text in a mono note. |

## Not done by design
- The "Match my device shows the language in effect" idea (critique 14) is skipped pending a spec change.
- Spec status: CMP-AppShell is still draft in its front matter; boards follow its text.
