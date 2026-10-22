# Code review — F-018 round 1 (commit dd3380d)

Reviewed against F-018 (ready spec, 9ed49cb) with MOD-Content, MOD-Pages, MOD-Meta, MOD-Shell, CMP-AppShell,
SCR-Policy, INV-02 and the ADR-0005 note from F-018.

What I checked:
- `pnpm test`: 483/483 pass.
- Full Chromium Playwright: 315 passed, all 10 F-018 e2e tests included.
- `spec_lint`: 0 errors, and every F-018 AC has a test.
- The home size gate on dist-samples: 94.4 KB brotli.
- `content/privacy.yaml` and `content/terms.yaml` were compared by script, section by section, with
  `policy-drafts.md`. Titles, dates, headings and bodies match exactly.

## Blocker
None.

## Major

### M1 — An http link wrapped over two lines passes the build and shows as raw `[text](address)`
`src/modules/content/policy.ts:100` (`policyLinkErrors`) and `:76-78` (`policyBlocks`)

- **The mismatch:** the two functions read the body differently.
  - `policyLinkErrors` checks one line at a time.
  - `policyBlocks` joins a paragraph's lines with a space before it looks for links.
- **What goes wrong:** when the link text breaks across a line (likely in long, hand-wrapped policy paragraphs), the
  INV-02 check sees no link, so the build passes. The page then drops the link because of the `continue` in
  `parts()` and shows the markup as literal text.
- **Spec:** this breaks the F-018 edge case "Text in a body that looks like a link but has an address other than
  https or email fails the build (INV-02)".
- **Verified** with `loadRegistry` on a `valid` copy whose terms body is:
  ```
  See [the example
  site](http://example.com) …
  ```
  The build passes, and the paragraph renders as `See [the example site](http://example.com) …`.
- **Fix:** have `policyLinkErrors` scan the same text the page renders. Walk `paragraphLines(body)`, strip `- ` from
  list lines, join with a space as `policyBlocks` does, run `LINK` on that, and report the paragraph's `start` line.
  This means one tokenizer for both functions. Better still, one shared walker over `sections[].body` that
  `policyLinkErrors` and `policyMixedLists` both use; they repeat the same `sections`/`body` boilerplate today.
- **Test to add:** an AC9-style unit case with the link text wrapped across two lines.

## Minor

### m1 — Some link-like text with a bad address fails silently instead of failing the build
`src/modules/content/policy.ts:36` (`LINK`)

- **The gap:** the address pattern `[^()\s]+` rejects an address that holds parentheses, spaces or a title. These
  are then never seen as links at all, so they are neither checked nor rendered as links.
- **Examples:**
  - `[run](javascript:alert(1))` builds and shows literally. This is safe, since it never becomes a link, but it
    should be an INV-02 build error under the edge case quoted in M1.
  - `[x](http://example.com "t")` builds with no INV-02 error.
  - `[wiki](https://en.wikipedia.org/wiki/Foo_(bar))` is a valid https link, but it is shown as raw markup with no
    error.
- **Verified** through `loadRegistry`: all three pass the build and render as literal text.
- **Fix:** add a loose detector, `/\[[^\[\]\n]+\]\(/g`. At each place it matches where the strict `LINK` does not
  also match, report an error naming the section, e.g. `INV-02: link "<raw>" must be an https or mailto address
  with no spaces or parentheses`. Other bracket text (`[note]`, `[x]()`) stays literal, as the spec says.

### m2 — Nested brackets swallow literal text into the link text
`src/modules/content/policy.ts:36`

- **The bug:** the label pattern `[^\]\n]+` allows `[`.
- **Example:** `Note [see [docs](https://x.com/) here]` renders a link whose text is `see [docs`. Only `[docs]`
  should be the link, and `[see ` should stay literal ("other bracket syntax … is literal text").
- **Fix:** change the label class to `[^\[\]\n]+`.

### m3 — The AC4 test doesn't read the built portal
`tests/unit/privacy-terms.test.ts` (F018_AC4) and `tests/e2e/link-previews.spec.ts:141-148`

- **The gap:** AC4 says "given the built portal". The unit tests only check `metaFor`/`headTags` and
  `sitemapEntries` over the `valid` registry, and the NFR-12 e2e loop over PROD pages leaves out `/privacy/` and
  `/terms/`.
- **What it misses:** if `src/pages/terms.astro` passed the wrong route, or the pages lost their head tags, the
  description and preview image would be wrong and no test would fail. The e2e checks only `<title>`.
- **Fix:**
  - Add `'/privacy/'` and `'/terms/'` to the `paths` list in the NFR-12 test.
  - Add a PROD `sitemap.xml` assertion for both `<loc>`s (as `resume.spec.ts:170` does for `/resume/`), named
    `F018_AC4`.

### m4 — `F018_AC5-missing-terms` duplicates the whole `valid` set
`tests/fixtures/content/F018_AC5-missing-terms/` (10 files)

- **The problem:** it is a full copy of `valid` minus `terms.yaml`. When `valid` changes (schema or invariant
  updates), this copy drifts, and AC5 can start failing for an unrelated reason. The test pins the exact single
  error line, so it would break.
- **Fix:** delete the fixture. In the test, use `contentFrom('valid')`, then `rmSync(join(dir, 'terms.yaml'))`.
  MOD-Content's "except the fixture for a missing file" allows having no such fixture.

## Checked, no finding
- **Overlays inherit from `valid`:** confirmed. Every overlay fixture (F001_*, F010-now-missing-updated, F017_*,
  F018 failing fixtures, INV03-*, INV07-*, typo-field, two-errors, several-errors-one-entry) is loaded only through
  helpers that `cpSync` `valid` first: `content-validation`, `content-derived`, `resume` and `privacy-terms` tests.
  The standalone sets (valid, samples, F005-favorites, F008_AC1/AC2, F010_AC5/AC6) all have both policies. The perf
  catalog copies `samples`.
- **Literal-block check:** `doc.getIn(path, true).type === 'BLOCK_LITERAL'` covers `|`, `|-`, `|+` and `|2`. Folded,
  plain, quoted and alias bodies are rejected. `bodyLine = line of the scalar (the "|" line) + 1 + i` is right,
  including leading blank lines. Verified: AC9 gives line 12 and the mixed-list fixture gives line 10. CRLF files
  parse the same as LF.
- **Escaping and security:**
  - No `set:html` in PolicyView or PolicyText. Text and labels are auto-escaped, and Astro's `toAttributeString`
    escapes `&` and `"` in `href`.
  - `javascript:` and `data:` never become links: they fail `linkAllowed`, which is a build error, or are not matched.
  - Web links get `target="_blank" rel="noopener noreferrer"`. `mailto:` links have no target.
  - Scoped styles are covered by Astro's CSP style hashes. No inline scripts were added.
- **Footer:**
  - Rendered only when `variant === 'full'`. The tool view (compact) has none; e2e confirms this for embedded and
    linked tools.
  - The 404 page shows the footer with no current link.
  - `aria-current="page"` is right on /privacy/ and /terms/ and absent elsewhere.
  - The narrow menu panel is absolute (z-index 3) and unaffected.
- **Main min-height:** the calc matches the header: frame top padding, bar min-height of touch-target + space-3, and
  the frame gap. The bar's 2 px border is not subtracted, so the footer lands 2 px lower, which is harmless. Home's
  reserve/prediction scripts don't depend on the viewport. The size gate passes.
- **R1–R5 are implemented:**
  - Pages, meta, sitemap order (public pages, then categories, then tools) and required files with error naming.
  - Copy IDs and tokens only; no new dependencies.
  - Implements comments are present.
