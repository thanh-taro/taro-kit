# Design fixes F-019 (Choose a language), round 1

Sources: `design-audit-F-019-round-1.md` (M1–M5, m1–m7) and `ui-critique-F-019-round-1.md` (1–15). Critique item 14 ("Match my device" shows the language in effect) was skipped as instructed: it needs a spec change.

Boards changed: CMP-AppShell, SettingsDesktop, SettingsMobile, PaletteDesktop, PaletteMobile, PolicyDesktop, PolicyMobile, canvas.json. Nothing under `specs/` or `src/` was touched.

Renders: `.build-my-app/reports/screens/F-019/round-2/` has 33 PNGs: the AppShell board (both themes), and Settings, Palette and Policy in both themes and both languages, plus Settings "device", Palette results/empty in vi-VN and Terms in vi-VN. They were made with the critic's stand-in runtime.

## Audit findings
| # | Resolution |
|---|---|
| M1 | Settings `language` tweak now drives all copy through a per-language dictionary `c` in renderVals: header, h1, legends, options, buttons, notes, privacy text and skip link. The root gets `lang="{{c.lang}}"`. "device" shows English, assuming a device that prefers English (stated in the board comment). |
| M2 | Policy `language` tweak drives the skip link, nav, search, header switch, theme label, settings label, date line, footer (COPY-footer.* vi) and a Vietnamese version of the sample policy (still labelled sample). |
| M3 | Palette boards have a new `language` tweak (en-US / vi-VN) that drives all copy in every state: groups, actions, placeholder, Cancel, hints, dialog label, opens-in-new-tab, and the Home backdrop (greeting, date, intro). The vi "language action" state shows "Thao tác" / "Chuyển sang English" (with lang en-US). The result count is an sr-only `role="status"` (COPY-palette.resultCount / resultCountOne, e.g. "1 kết quả"). The "Also found by…" annotation moved to a mono board note. |
| M4 | New CMP-AppShell cells: compact · vi-VN; full · 721 px in en and vi (mark-only logo); narrow · vi-VN at 320 px; narrow · menu open · vi-VN at 320 px. |
| M5 | The menu-open cells show the bar with Menu `aria-expanded="true"` (sel / selLine fill). The vi cell shows the focus ring on the switch row (AC20). |
| m1 | The vi theme-toggle label comes from `{{t.toggleLabelVi}}`: "…giao diện sáng" in dark, "…giao diện tối" in light. The icon stays the board-wide moon glyph, as in the English cells. |
| m2 | No more `lang=""`. Settings radios use `sc-if` branches (only English and Tiếng Việt carry lang). Palette rows render the lang span only when `r.hasLang`. Checked with a strict renderer: 0 empty lang attributes. |
| m3 | Each radiogroup has `aria-labelledby` pointing to its legend (ids s-theme/s-lang, ms-theme/ms-lang). A board note says these are native radios in code. Mobile Language stacks in one column. |
| m4 | In vi-VN the whole COPY-policy.updated line uses Manrope 13 px medium muted. en keeps mono (ASCII). |
| m5 | Settings and Policy desktop headers now use the current shell: search, language switch, theme toggle, settings. The mobile headers show search, theme toggle and Menu; the switch lives in the menu, per CMP-AppShell narrow. |
| m6 | Every language switch has `position: relative`. |
| m7 | New and rewritten elements use 4-pt values: switch padding 0 8 / gap 8, note 12/16, Settings sections 24/16, palette rows 12. Untouched pre-existing chrome (offline pill, skip link) is unchanged. |

## Critique findings
| # | Resolution |
|---|---|
| 1 | Full · 721 px cells in both languages, mark only (brand is sr-only), icon search, nav padding 8, column gap 12, bar 689 px. Measured with no overflow. |
| 2 | Switch restyled as a ghost button: transparent, no border, muted, 13 px medium, radius 10, padding-inline 8, 16 px globe, gap 8, 44 px high. |
| 3 | The narrow menu switch is a full-width row: 44 px, padding 12, 15 px, muted, globe 16, gap 8, no border. It shows the whole COPY-shell.languageSwitch text below the divider. |
| 4 | SettingsMobile Language is one column (1fr, left-aligned, padding 12, same selected fill). Theme stays one row; its columns are sized to their labels (`repeat(3, auto)`, nowrap), so "Theo hệ thống" no longer wraps. |
| 5 | Settings: vi copy (see M1), current header, and backupScope, privacy, privacyTools and privacyHosting copied exactly from copy.md. The privacy section now has all 3 paragraphs. Also added the missing `--tint` token to SettingsMobile. |
| 6 | Same as m4. |
| 7 | The designer note left the row and went into a board note. Actions have no description line, because no description copy exists (this also removes the stale non-COPY Export description). |
| 8 | The palette language action uses the 16 px globe in the tint tile (accent). |
| 9 | Stable width: both names are stacked in one inline-grid cell, the inactive one `visibility: hidden` + `aria-hidden`. Applied on every header switch (AppShell, Settings, Policy). |
| 10 | The translation note reuses the privacy-callout style: tint, fg, radius 12, padding 12/16, 16 px info icon in accent, gap 12, 14 px. No stripe. |
| 11 | Policy vi shows the vi title ("Quyền riêng tư" / "Điều khoản sử dụng"), nav, header with switch, and footer. The Unbounded 44/28 px titles fit on one line with no clipped marks, so line-height stays 1.15. |
| 12 | New cell "language switch · states" with rest / hover (fg on surface2) / focus (2 px accent ring, 2 px offset) in both languages. The focus caption points to it. |
| 13 | The switch, theme toggle and settings sit in an end cluster with gap 4 px on every board touched. |
| 14 | Skipped: optional, needs a spec change. |
| 15 | Same as m2. |

## Other
- Designer notes that were drawn as UI text on CMP-AppShell ("Focus ring…", "The offline pill…") moved into mono captions. Captions and notes avoid Vietnamese letters, so mono text stays ASCII. Board notes inside screen frames carry `lang="en-US"`.
- Brand text is now `TaroKit` with `data-copy="COPY-shell.brand"`, uppercased by CSS. Nav `aria-label="Main"` was dropped, because it had no COPY ID.
- Policy list loop variable renamed `i` → `item`, because it collided with the loop index in the stand-in runtime (lists rendered as "0, 1, 2").
- canvas.json: CMP-AppShell h 2700 → 3620 (and `$preview` height). CMP-ToolHeader, CMP-FavoriteToggle and CMP-StateMessage shifted down by 920. The d2scope note mentions the Language tweak. All other board heights are unchanged, because content fits within the existing frames. Overlap check: 0.
- Checks on the rendered boards: no unresolved `{{…}}`, no `lang=""`, no non-ASCII text in the mono face, and the only visible text without data-copy is sample policy content (labelled sample) and the logo mark "T".
