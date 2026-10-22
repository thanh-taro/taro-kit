# Design audit F-018, round 1 (commit f06133c)

Scope: design/canvas/PolicyDesktop.dc.html, PolicyMobile.dc.html, CMP-AppShell.dc.html (footer), canvas.json; compared with .build-my-app/reports/screens/F-018/*.png.

Verified OK: state x theme x page present via tweaks (theme dark/light, page privacy/terms) at 1440 and 390; all color custom properties equal tokens.json (both themes); COPY IDs on brand, nav, search, themeToggle, menu, skip, footer.privacy/terms and policy.updated match copy.md; date has <time datetime="2026-10-22"> in full format; sample content labeled as sample; one h1, h2 sections; aria-current="page" on the shown footer link (component and screens); compact variant states "no footer"; canvas.json: no overlaps on either page, titles follow `<SCR-ID> / <state> / <viewport>`; footer targets 44 px; link text colors (accent) are underlined; muted date/footer text passes muted/bg 4.5 per tokens contrast pairs.

| Severity | Frame / file | Finding | Spec ID | Fix |
|---|---|---|---|---|
| Major | PolicyDesktop.dc.html (header) | Full shell header has no search control (placeholder COPY-palette.placeholder with key cap), but the implemented desktop header shows it. A board that omits it would be built wrong or diverge from implementation. | CMP-AppShell anatomy / full; SCR-Policy region 1 | Add the full-variant search button (copy the one in CMP-AppShell full row, data-copy="COPY-palette.placeholder") before the theme toggle. |
| Major | CMP-AppShell footer, PolicyDesktop/Mobile footer | Current-page marking is a surface2 fill (about 1.1:1 against bg, invisible to most users) plus weight 600 and fg-vs-muted color. Beyond the aria-current attribute, the visual cue is effectively color/weight only. In the implementation screens (privacy/terms dark+light) the pill is barely distinguishable. | F-018.R3; CMP-AppShell Behavior; NFR-09 | Add a non-color cue with sufficient contrast: e.g. 2px underline or lineStrong/accent bottom border on the current link, on both boards and in the implementation; keep aria-current. Document it in CMP-AppShell. |
| Minor | PolicyDesktop.dc.html section | `gap: 14px` between section heading and body is not a space token (4-pt: 12 or 16). | tokens.json space | Use 12px or 16px (mobile board uses 12px). |
| Minor | PolicyMobile.dc.html header | `padding: 0 4px 0 14px` uses 14px, not a space token. | tokens.json space | Use 12px or 16px. |
| Minor | CMP-AppShell footer rows | Narrow footer is shown only on Home (none current); Privacy/Terms-current narrow is only on the screen board tweaks, and Terms-current is not shown in the component. Coverage is satisfied via screen tweaks but the component rule is "every row of Variants & states". | CMP-AppShell variants | Optionally label a second footer cell with Terms current, or note in the cell label that the current state is covered by SCR-Policy tweaks. |
| Minor | Boards vs implementation | Board footer inset is 8px (desktop) / 4px (mobile) while the implemented mobile home footer starts at about 16px from the content edge; link text on Home mobile is at 32px vs content at 24px. Board paragraph width 640px matches implementation. | CMP-AppShell | Align footer horizontal padding with the main content inset (8px) on mobile. |

Not findings: board-only aria-labels "Settings" and "TaroKit home" without COPY ID follow the existing practice on other boards; the "Sample policy" annotation under the footer is a labeled sample note, not product copy.

Blockers: none.
