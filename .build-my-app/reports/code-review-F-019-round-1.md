# Code review: F-019 Choose a language, round 1

Diff: `git diff 59e5a3b..HEAD` (d4d9a4f, be65355, c0cab69, 1ad2b71, c2e0e33, 569162a).
Spec context: F-019 (full), ADR-0012, the ADR-0010/0011 notes, MOD-Language, and the shipped specs it changes.

## Checks run
- `pnpm test`: 30 files, **543 passed**.
- `python3 tools/spec_lint.py --coverage tests/`: **0 ACs without a test**, 0 errors, 0 warnings.
- On the existing `dist/`: `check-dist-fonts` ok (51.9 KB, both languages covered), `check-dist-size` ok (home 101.7 KB brotli, NFR-11), `check-dist-clean` ok.
- Manual Playwright probe against `dist-samples` (preview on port 4591):
  - The catalog live region re-announces on a switch (M1).
  - Other windows switch language with no navigation (m1).
  - The Résumé title in Vietnamese is "CV — TaroKit".
  - The palette placeholder is in Vietnamese before first paint.

## Counts
- Blocker: 0
- Major: 1
- Minor: 5

## Blocker
None.

## Major

### M1. A language switch on the Tools page re-announces the result count in the new language
- **Where:** `src/modules/pages/catalog/CatalogSearch.tsx:99-114`
- **Breaks:** F-019 UX notes ("Switching must not move focus or announce anything beyond the control's own new state"). The module comment at lines 15-17 and 78 says a switch announces nothing.
- **Why it happens:** `results` lists `lang` in its `useMemo` deps (line 105). A switch therefore builds a new array, which re-runs the count effect (line 110, deps `[searching, results, data]`). That effect writes `countText(...)` through `langRef`, which by then holds the new language, so the polite live region changes text.
- **Scenario (seen in the browser):**
  1. Tools page, English showing, a query typed.
  2. The region reads "0 tools".
  3. The user presses the header switch.
  4. The region changes to "0 công cụ" and the screen reader announces it.
  5. This is exactly F019_AC3's setup, but `tests/e2e/language.spec.ts:86` does not check the live region.
- **Fix:**
  - Drop `lang` from the ranking. Tool names have one version (INV-09), so the tie-break needs no language; see m2. With `lang` gone from the `results` deps, the effect no longer runs on a switch.
  - If `lang` must stay, guard the effect: keep the last announced `(query, results.length)` in a ref and announce only when it changes.
  - Add to F019_AC3: `catalog-count` text is unchanged after the switch (or record mutations, as the probe did).

## Minor

### m1. Other open windows switch language live; the spec says on the next page open
- **Where:** `src/modules/language/index.ts:55-57` together with the store's `storage`/`focus` refresh (`src/modules/personal-data/store.ts:278-285`).
- **Spec:** F-019 edge cases say "Another open window of the portal picks up a language change the next time a page opens in it."
- **What happens:** `choice` is computed from the store's preferences, so a switch in tab A immediately switches tab B (confirmed). Tab B also posts `taro:language` to its embedded tool and, through M1, can announce in the background.
- **Fix (simplest):** amend the edge case to "picks it up at once, as the theme does (F-005 last write wins)" and keep the code. If the spec wording must stand, have `createLanguage` resolve `shownLanguage` from the choice read at page start plus this page's own `setLanguage` calls, ignoring later store refreshes.

### m2. Name ties in search use the collation of the language showing, so tie order differs between languages
- **Where:** `src/modules/search/rank.ts:398-404`
- **Breaks:** ADR-0012 "Sorting: lists sorted by name use the one-version tool name, so the order is the same in both languages". It also stops matching MOD-Content `byName` (en collation), which the catalog grid uses.
- **Scenario:** tools "Đa…" and "De…" both match at the same tier. `'Đa'.localeCompare('De','en') = -1`, but `'vi-VN'` gives `1`. The result order flips on a switch, and catalog search results reorder under the user.
- **Fix:** restore `byName(a.item, b.item)` for ties (it already picks en-US for two-version names). Then drop `lang` from `RankContext`, `searchPalette`, `paletteView` and `filterCatalog`; this also removes the root cause of M1.

### m3. The palette's language-action keywords are hard-coded strings outside MOD-Copy, and no spec describes them
- **Where:** `src/modules/palette/logic.ts:35` (`LANGUAGE_ACTION_KEYWORDS = ['language', 'ngôn ngữ', 'English', 'Vietnamese', 'Tiếng Việt']`).
- **Breaks:** ADR-0012 says never use a raw string; MOD-Copy owns every string. "Vietnamese" appears in no COPY row.
- **Spec gap:** RULE-05 only matches an entry's own text. "Switch to Tiếng Việt" / "Chuyển sang Tiếng Việt" contain neither "language" nor "ngôn ngữ", so AC19 cannot pass from the spec as written. The keywords were invented to make it pass; only MOD-Palette's as-built notes document them.
- **Fix:** build the tags from `tBoth('COPY-settings.language')` (Language / Ngôn ngữ) plus `COPY-language.en` and `COPY-language.vi`. Propose a one-line spec change to CMP-CommandPalette (or RULE-05) saying the switch-language action also matches COPY-settings.language and both language names. Drop "Vietnamese" unless the spec adds it.

### m4. ADR-0012's lint check for literal text in components is missing
- **Where:** `eslint.config.js` has no literal-text rule.
- **Spec:** ADR-0012 Consequences: "a lint check flags literal text in components".
- **Current state:** a grep of `src/**/*.tsx|*.astro` found no literal text or literal `aria-label`/`title`/`alt`/`placeholder` today. The guard that keeps it that way is missing.
- **Fix:** enable `react/jsx-no-literals` (via `eslint-plugin-react`, registered per the dependency policy) for `*.tsx`, with an allow-list for the glyphs (`Esc`, `↵`, `T`), plus a small check for `.astro` templates. Or amend the ADR to say the check is the grep in review.

### m5. Spec files changed inside build commits
- **Where:** commit 569162a changed:
  - `specs/10-domain/project.schema.json`: tag `maxItems` 12 → 20
  - `specs/10-domain/model.md`
  - the wording of `specs/20-features/F-019-language.md` AC3
- **Why it matters:** the project rule is to stop and propose spec changes rather than edit them while building. spec_lint passes, and both edits are sensible (the AC3 clarification matches a header that does not stick).
- **Fix:** confirm the Owner approved both changes and that `specs/60-delivery/changelog.md` records them. No code change needed.

## Checked and found conformant (no finding)
- **Pre-paint script**
  - One script (theme + language), hashed once (`BaseLayout.astro:49`), first element of `<body>`.
  - Built HTML is `lang="en-US" data-lang="en-US"`; the script changes it only for vi-VN.
  - `<title>` swaps from `data-l-vi-VN`.
  - A MutationObserver swaps localized attributes as the parser adds them, then disconnects at DOMContentLoaded.
  - Storage unavailable: `readStoredLanguage` catches, so the device decides.
  - RULE-16: `resolveLanguage` takes the first `en`/`vi` primary language, else en-US.
- **Switch**
  - Delegated listener with `preventDefault`; focus stays on the button.
  - CSS-only text swap with `display:none !important` on the other language, so scroll, typed text and the menu are kept (AC20).
  - The bar switch keeps a stable width (inline-grid plus `visibility:hidden`); accessible name comes from content.
- **Islands**
  - `useShownLanguage` re-renders computed text and attributes.
  - Preact hydration does not patch attributes, so no English flash.
  - The palette announcement uses a ref and resets on close; the palette action closes first, then switches.
- **Dates:**
  - Home clock uses Intl per language: "Thứ 6, 23 thg 10" and "8:00" verified with ICU 78.
  - Résumé, policy and changelog dates are built in both languages.
  - `tk-mono-words` keeps the ASCII mono subset off Vietnamese words.
- **Search:**
  - Keys hold every distinct name and summary version; the best tier across versions wins (RULE-05).
  - Pages and actions match both COPY versions; results show in the language showing (AC9 and AC19 tested).
- **Tool handoff:**
  - `src` carries `theme` and `lang`.
  - `taro:language` goes to the exact origin, only on change, tracked apart from the theme.
  - Ready is answered with both; the origin and source checks are unchanged.
  - Open-in-new-tab and linked tools use the catalog URL unchanged (AC11–AC14 covered).
  - A reconnect rebuilds `src` with the current language.
- **Personal data v2:**
  - `SCHEMA_VERSION = 2`; `normalizeDocument` keeps only `en-US`/`vi-VN`; `setLanguage(null)` removes the key.
  - A newer document on disk is never overwritten (the pre-existing `newerOnDisk` logic), which is what the ADR-0010 note's older-tab case relies on.
- **Backup import:**
  - A v1 file migrates with no language.
  - `fr-FR` is damaged because normalize changes it.
  - Erase leaves no language (F013_AC8/11/12/13 covered).
- **Content:**
  - INV-09 errors read `file › entry › INV-09: <field> …` (AC18).
  - Strings are normalized to NFC before validation.
  - Policy link and list checks run per language.
- **Previews and English defaults:**
  - Previews, `og:locale en_US`, manifest name/description/`lang: en-US` and the sitemap are English.
  - No-script shows English (AC15).
- **e2e `useInnerText: true`:**
  - Not weaker: `innerText` drops the `display:none` copy, so each assertion still checks the one visible language, as `textContent` did before the second copy existed.
  - `kbd` → `kbd:visible` follows the per-language duplicate key caps.
  - The removed `toHaveText` lines were all re-added with the option or a `pick(..., 'en-US')`.
- **Leftover literals:**
  - No raw UI strings found in components.
  - Every `t()` call passes an explicit language.
