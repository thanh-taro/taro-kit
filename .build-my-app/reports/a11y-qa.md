# Accessibility QA, phase 5

Scope: NFR-03, NFR-04, NFR-07, NFR-09, specs/30-experience. Build: main at 6620240 (dist/ on :4381, dist-fixtures/ on :4382, the latter through the tarokit.test proxy like tests/e2e/support/sites.ts).
Method: Playwright 1.64 + axe-core 4.13 (Chromium 156). Matrix: light and dark x 390 / 1280 / 320 px. Pages: home (empty and with favorites and recents), catalog (filter, no results, empty), category, projects, about, now (with and without note, empty), settings (erase, clear, import error, import confirm), tool view (loading, slow after 10 s, loaded, linked, offline, not found), palette (open, results, no results), narrow nav menu.
`page.accessibility.snapshot` no longer exists in Playwright 1.64; the reading pass used `locator.ariaSnapshot()` (same tree). Probe scripts were kept outside the repo; no repo file was edited.

## Summary
Blocker 0, major 2, minor 9.

## Findings

### Major

**M1. Page scrolls sideways at 320 px on every page with the full shell**
- WCAG 1.4.10 Reflow, NFR-07. Pages: all except tool view. Themes: both. State: 320 px (also 400 % page zoom on a 1280 px window).
- Repro: open any page at 320 px wide. `scrollWidth` is 326 and `clientWidth` is 320. The Menu button (`.nav .menu`, 89 px wide) ends at x = 326, the header border is clipped, and mobile browsers widen the layout viewport.
- Fix: src/modules/shell/AppShell.astro:126 (`.shell`) and the narrow block at about :410-445. At 320 px the logo (about 120 px) + search icon + theme toggle + Menu does not fit. Options: `@media (max-width: 359px) { .word { display: none } }`, or give `.logo` `flex: 0 1 auto; min-inline-size: 0` and shrink the Menu padding (`--tk-space-3`) at that width. Add an e2e check that `scrollWidth <= innerWidth` at 320 px.

**M2. Selected theme choice is invisible in forced colors**
- WCAG 1.4.1, 1.4.11. Page: settings, Appearance. Themes: both. State: Chromium `forcedColors: 'active'`, 390 and 1280 px.
- Repro: emulate forced colors, open /settings/. System, Light and Dark look identical, so the checked radio can't be told apart. The selected segment is shown only by `background: accent`, which forced colors removes. The native radio is `opacity: 0`.
- Fix: src/pages/settings/index.astro:158. Add a non-colour cue to `label:has(input:checked)`, for example `outline: 2px solid transparent; outline-offset: -2px` (transparent outlines show in forced colors) plus a check mark, and in `@media (forced-colors: active)` use `background: Highlight; color: HighlightText`.

### Minor

- **m1. Days-used strip: filled days vanish in forced colors** (1.4.1; settings; both themes). The count text states the number, so information is not lost. Fix: src/pages/settings/index.astro:197, add a forced-colors rule (`background: Highlight`) or a border style.
- **m2. Selected palette row and current Settings icon rely on background only in forced colors** (1.4.11; palette, header; both themes). The palette still shows the Enter key cap on the selected row. Fix: src/modules/palette/palette.css:122 and src/modules/shell/AppShell.astro:363, add a forced-colors outline or border.
- **m3. Tool header title truncated with an ellipsis on narrow screens** (1.4.4, 1.4.10; tool view; both themes). At 390 px "Fixture embedded t...", at 320 px "Fixture em...". The h1 can't be read in full. Fix: src/modules/design-system/styles/tool-header.css:75-83, allow two lines (`white-space: normal; overflow-wrap: anywhere; -webkit-line-clamp: 2`) or add `title`.
- **m4. What's-new link name clipped at 320 px** (1.4.10; home; both themes). `a.tk-whatsnew__link` scrollWidth 151 > clientWidth 137 for "Fixture clipboard tool". The accessible name is intact. Fix: src/modules/pages/home/home.css:132, replace `flex: none` with `flex: 0 1 auto; min-inline-size: 0; overflow-wrap: anywhere`.
- **m5. Tool view toolbar and region share the name "<tool> tool"** (best practice / 1.3.1; tool view; both themes). axe `landmark-unique` (moderate, on `#main`). Fix: src/modules/design-system/ToolHeader.tsx:50 and src/modules/tool-host/ToolView.astro. This needs a spec change, since COPY-tool.frameLabel is used for both. Propose a distinct toolbar label such as "<tool> actions".
- **m6. All type sizes are in px** (1.4.4 advisory, larger-text support; all pages). src/generated/tokens.css:12-23 (from specs/30-experience/tokens.json) means browser default font-size and text-only zoom change nothing. Page zoom to 200 % and 400 % works. Fix: emit rem in the token build (15px = 0.9375rem) and keep the 44 px targets in px or in rem with a floor.
- **m7. No visible focus on the programmatic focus targets in the tool view** (2.4.7; tool view; both themes). On entry focus goes to the toolbar (`.tk-toolheader:focus { outline: none }`, tool-header.css:11), and the skip link lands on `#tool` (ToolView.astro:82). SCR-ToolView sanctions this, and the next Tab shows rings. Consider a subtle `:focus-visible` ring on `#tool` for keyboard users.
- **m8. Loading spinner is static under reduced motion** (2.3.3 is satisfied; tool view). global.css:70 sets `animation-duration: 0s` on all animations, so the infinite spinner stops. The status text "Getting X ready..." still shows. Fix: keep a slow opacity pulse (style.md allows opacity) or leave as is.
- **m9. Focus return after the import confirm** (2.4.3; settings; both themes). With a programmatic file pick, focus returned to `body` after Escape (the erase and clear dialogs return correctly to their buttons). In a real browser the picker usually restores focus to the button, so it needs a manual check. Fix if it fails: src/modules/pages/settings/ConfirmDialog.tsx:44, pass an explicit return-focus ref (the Import button) rather than `document.activeElement`.

## Passed (automated)
- axe (wcag2a, 2aa, 21a, 21aa, 22aa, best-practice): 0 critical or serious on every page and state above, in both themes and all three widths, and with the palette (open, results, none), the narrow menu and the erase dialog open. The only violation is m5 (moderate).
- Contrast: `python3 tools/token_contrast.py` reports 0 failing pairs (category tints included). A pixel check (text rendered transparent, background sampled, worst of 15 samples per text node) over 9 pages x 2 themes x 2 widths found no text below 4.5:1 (or 3:1 for large text). Dark-theme gradient areas, which axe reports as "incomplete", pass this way.
- Targets at 390 px: every button, input, menu item and palette row is at least 44 px. Cards and what's-new rows use stretched links with rows of 52 to 77 px, and the favorite toggle is 44 x 44.
- Keyboard: skip link first and visible on every page. Tab order is logical, with no traps and every control reachable. Focus rings are present (stretched-link cards draw the ring on the card). Palette: opens with the button, Enter and Meta+K, focus in the combobox, arrows move `aria-activedescendant`, Escape closes and focus returns to the opener. The native modal dialogs (palette, erase, clear, import) keep Tab inside the page. The narrow menu: `aria-expanded` is correct, focus moves to the first item, Escape and outside click close it, focus returns to Menu.
- Semantics: one h1 per page and no skipped levels (home, catalog, category, projects, about, now, settings, tool, not found). Unique titles end in "- TaroKit". `lang="en"`. Landmarks: banner, nav, main, labelled regions. Catalog count (`aria-live=polite`: "1 tool", "0 tools"), palette count ("8 results") and no-results message, offline status (shell pill, notice and tool message as `role=status`), slow-load hint, import errors (`role=alert`, the "!" glyph is `aria-hidden`), `aria-pressed` on favorites, `aria-current` on nav and the confirm-dialog name and description all read correctly in the accessibility tree.
- Reduced motion: no running animations, smooth scrolling or transforms with `prefers-reduced-motion: reduce` (home, palette, tool loading).
- Forced colors: borders, focus rings, buttons, cards, palette and menu stay visible (except M2, m1 and m2).
- 200 % page zoom (640 x 425): no horizontal scroll, no lost function. The erase dialog buttons stay reachable at 320 x 256. The category tile row scrolls sideways on purpose and its tiles are links.
- No gesture-only interactions (no swipe, drag or multi-touch handlers in src/).

## Not covered here
- Update-ready banner (needs a new service worker version), real offline behaviour of the service worker, StorageNotice (storage refused), the production tool view for the sample tools (their origins don't resolve; the fixture tools were used), Firefox and WebKit, and the real file-picker focus return (m9).

## Manual checks for a real screen reader (VoiceOver on macOS/iOS Safari, NVDA on Windows with Firefox or Chrome)

Setup: VoiceOver is Cmd+F5, then VO = Ctrl+Option; NVDA is Insert+Space for the browse-mode toggle. Use the production build or the live site, in a fresh profile.

1. **FLOW-02 first visit (NFR-03).** Open the home page. Press Tab once and confirm "Skip to content" is read, then Enter and confirm reading continues at the greeting. Use the headings rotor (VO+U, or NVDA H) and confirm: h1 greeting, then h2 sections in order. Use the landmarks rotor: banner, navigation, main.
2. **Search and palette (FLOW-01).** Press Cmd+K (Ctrl+K on Windows), or activate the search button. Confirm "Search TaroKit, dialog", the field name and "8 results" being spoken. Type a name and confirm the result count update is announced without moving focus. Use Down Arrow and confirm each option and its group is read. Type nonsense and confirm "I couldn't find ..." is spoken. Press Escape and confirm focus returns to the search button.
3. **Catalog filter.** On /tools/, type in "Filter my tools". Confirm "N tools" is announced after each change, and "0 tools" with the no-results heading. Confirm "Clear search" is reachable and focus is sensible after using it.
4. **Favorites.** On a card, Tab to the star. Confirm "Add to favorites, toggle button, not pressed", press Space, and confirm "pressed" and the changed name ("Remove from favorites") are announced, plus the polite status message.
5. **Narrow nav (iOS VoiceOver, or desktop at 390 px).** Activate "Menu". Confirm "expanded", that the list is read as links, and that "Tools, current page" is announced. Escape or a two-finger scrub closes it and focus lands on Menu.
6. **Tool view.** Open an embedded tool. Confirm the toolbar name, the h1, and that focus enters the toolbar on arrival. Use the skip link and confirm it moves into the tool frame. Start with the network throttled and confirm "Getting X ready..." is announced, then the slow hint after 10 s. Go offline (airplane mode) and confirm the shell "You're offline" and the tool's "needs the internet" messages are each announced once, not twice in a row.
7. **FLOW-03 backup.** In Settings: export, then import a bad file and confirm the error is announced at once without moving focus. Import a good file and confirm the confirm dialog reads its title, the file name as description, and starts on Cancel. Press Escape and confirm focus returns to "Import from file" (m9). Then try "Erase your data" and Cancel/Confirm, and confirm the outcome is announced.
8. **Theme.** In Settings, use arrow keys on the Theme radios and confirm "System, radio button, 1 of 3, selected" and the change. Toggle the header theme button and confirm the new name ("Switch to light theme") is read.
9. **Update message.** With a newer build deployed, return to an open tab and confirm the update-ready text and its Refresh button are announced and reachable.
10. **High-contrast spot check.** Windows Contrast themes (or macOS Increase Contrast plus Invert Colors) with NVDA or VoiceOver off: check M2, m1 and m2 are fixed and the focus ring is visible on cards and in the palette.
