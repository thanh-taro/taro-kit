# Code review: F-019 Choose a language, round 2

Scope:
- Commit 2f53979, checked against `code-review-F-019-round-1.md` and `security-F-019.md` L-1/L-2.
- m5 (the tag limit 12 → 20 and the AC3 rewording) was a coordinator spec decision, recorded in the changelog. It is not counted.

## Checks run (at 2f53979)
- `pnpm test`: 31 files, **548 passed**.
- `pnpm lint` (eslint, including `tk/no-literal-text`, and prettier): clean. The rule reports no violations across `src`.
- `pnpm run check` (astro check plus gen check): 0 errors, 0 warnings. The generated files are up to date.
- `python3 tools/spec_lint.py --coverage tests/`: 0 ACs without a test, 0 errors.
- Full Chromium e2e: the coordinator reports 338 passed, 0 failed (I did not re-run it).
- I ran ad-hoc ESLint `lintText` probes of the new rule's scope.

## Counts
- Blocker: 0
- Major: 0
- Minor: 1 (new)

## Round-1 findings
| # | Status | Notes |
|---|---|---|
| M1 catalog re-announces on a switch | **Fixed** | `CatalogSearch.tsx:104-105`: `lang` has left the `results` memo, so a switch no longer changes `results` and the count effect does not run. `Palette.tsx:208` is the same: `groups` no longer depends on `lang`. The announcement text still uses the language showing through `langRef`. F019_AC3 now asserts that the live region does not change at all (MutationObserver count 0, same text). |
| m1 other windows switch live | **Resolved by spec** | The F-019 edge case now reads "switches too, as soon as it is shown again, as it does for the theme". The code switches on the `storage` event, even while the window is hidden, and on `focus`. What the user sees matches the new wording. |
| m2 lang-collation tie-break | **Fixed** | `rank.ts:73-77` uses `byName` (en collation, one-version names). `lang` has been removed from `RankContext`, `searchPalette`, `paletteView` and `filterCatalog`. A unit test covers "Đa…" before "De…". MOD-Search docs updated. |
| m3 hard-coded keywords | **Fixed** | `palette/text.ts:98` builds `languageKeywords` from `COPY-settings.language` and the two language names (`['Language', 'Ngôn ngữ', 'English', 'Tiếng Việt']`). `paletteIndex` takes them as an argument; no literals remain. F-004.R5 and F-019.AC19 were updated to match ("english" added, "Vietnamese" dropped). The unit test covers `ngôn ngữ`, `ngon ngu`, `language`, `english` and `Tiếng Việt`. |
| m4 literal-text lint | **Fixed** (with a scope gap, see N1) | `eslint-rules/no-literal-text.js` runs on `src/**/*.tsx` and `src/**/*.astro` and allows `Esc` and `T`. It is a local rule, so no new dependency. JSX text and literal `aria-label`/`title`/`alt`/`placeholder` are flagged in both file types; I confirmed the astro parser produces `JSXText`. Three unit tests cover it. Text needs at least one letter to be flagged, so punctuation, numbers and glyphs (`·`, `↵`, `⌘K` labels coming from expressions) pass, as they should. |

## Security report
- **L-1 attribute allowlist: fixed.**
  - `localizedAttrs` is typed to `LocalizedAttr` (`aria-label | placeholder | alt | title`).
  - `swapLocalizedAttributes` checks each name against `/^(aria-label|placeholder|alt|title)$/` before reading or writing. The regex is a local `const`, so the inlined function stays self-contained.
  - The pre-paint observer uses the same function, so it is covered too.
  - All existing `data-l-a` users (aria-label, placeholder, alt, title, and the palette bootstrap's `data-l-placeholder-*`) are on the allowlist, so nothing regresses.
  - A unit test checks that `href` and `onclick` are never written.
- **L-2 pre-paint robustness: fixed, no regression.**
  - `theme/inline.ts`: the theme IIFE body is wrapped in `try{…}catch(e){}`, and `languageInlineScript` still follows it as a separate statement.
  - `var t` inside the try block is scoped to the function, so nothing outside depends on it.
  - `readStoredTheme` already catches its own errors, so the new guard only covers `matchMedia`, `setAttribute` and `NodeList.forEach`. If one of those fails, `data-theme` stays unset until MOD-Theme's module script sets it, which is the intended fallback.
  - The CSP hash is still computed from the same `themeInlineScript` string (`BaseLayout.astro:49`), so it stays in step.
  - A unit test runs the script with a throwing `matchMedia` and gets `lang="vi-VN"`.
- **I-3 (COPY-storage.unavailable): fixed.** The copy names theme and language in both columns, `src/generated/copy.ts` is regenerated, and the favorites e2e constant is updated.

## New finding

### N1 (minor): `tk/no-literal-text` misses literals inside JSX expressions and on non-text props
- **Where:** `eslint-rules/no-literal-text.js:57-78`. Only `JSXText` and four attribute names are checked.
- **Scenario (probed with `ESLint.lintText` on `src/modules/x/*.tsx|.astro`):** none of these are reported:
  - `<p>{'Save'}</p>`
  - `` <p>{`Saved`}</p> ``
  - `<p>{c ? 'Yes' : 'No'}</p>`
  - `<Comp label="Close" />`
  - `aria-description="Hint"` and `aria-roledescription="slide"`

  These are the usual ways an untranslated string gets into an island. A grep of `src` finds none today, so nothing ships wrong now; the guard ADR-0012 asks for is just narrower than it needs to be.
- **Fix:**
  - Add a `JSXExpressionContainer` handler. When its parent is a `JSXElement` or `JSXFragment`, report a string `Literal`, a `TemplateLiteral` with no expressions, or either branch of a `ConditionalExpression` / `LogicalExpression` that is one of those.
  - Add `aria-description`, `aria-roledescription`, `aria-valuetext` and `label` to `TEXT_ATTRS`.
  - Add a unit test case for each.

## No regressions found
- Removing `lang` from the search API: every caller has been updated (Palette's `paletteView` in its memo and in `onKeyDown`, `searchPalette`, CatalogSearch); type check and lint are clean.
- `compareRanked` keeps its two-argument signature, as MOD-Search documents.
- Visible order is unchanged for English, because the old default was en-US. Vietnamese now gets the same order as English (ADR-0012).
- Per-language display is untouched: results, counts and messages still render in the language showing through `useShownLanguage`/`pick`.
