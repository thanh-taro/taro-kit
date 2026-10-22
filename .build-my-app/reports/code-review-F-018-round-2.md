# Code review: F-018 round 2 (commit aa613bb)

Scope: only the fixes for code-review round 1 (M1, m1–m4) and design-audit round 1.

What I ran:
- `vitest run tests/unit/privacy-terms.test.ts`: 26/26 pass.
- `spec_lint`: 0 errors.
- A throwaway probe of `policyBlocks` and `policyLinkErrors` on edge-case bodies. I deleted it afterwards.
- I did not run Playwright, since another process holds the suite.

## Blocker
None.

## Major
None.

## Round-1 findings: all fixed and tested
- **M1:** `policyBlocks` and `policyLinkErrors` now share `paragraphsOf`/`runsOf`/`findLinks`, so the check sees the same text the page shows.
  - The new unit tests cover both cases. A wrapped http link fails at `terms.yaml:8 › section 1 › INV-02`. A wrapped https link renders as one link.
  - The existing AC9 fixture still reports line 12.
- **m1:** `LINK_LIKE` plus the sticky `LINK` find "looks like a link" text that is malformed. All four round-1 examples are covered: `javascript:` with parentheses, a title, parentheses in the address, and a space.
  - There is a `loadRegistry`-level test of the message.
  - The message gives the author an actionable fix (`%28`/`%29`).
- **m2:** the label class excludes `[` and `]`. The nested-brackets test asserts that `Note [see ` stays literal.
- **m3:**
  - NFR-12 now covers `/privacy/` and `/terms/`.
  - The new e2e test `F018_AC4` reads the built head tags: title, description, og:*, canonical, no robots, and the shared image. It also checks both sitemap `<loc>`s.
- **m4:** the duplicate fixture is deleted. The test removes `terms.yaml` from a copy of `valid`. Its first `toThrow` assertion keeps the try/catch from passing vacuously.

## Excluding `[x]()` from the loose detector: sound
The spec's edge case is about text "that looks like a link but has an address other than https or email". `[x]()` has no address at all, and the spec says other bracket text stays literal. The literal rendering is inert, and there is no way for it to become a link. Any non-empty address (`[x]( )`, `[x](mailto:)`) still fails.

## Design: all fixed
- The footer's current link is now marked by fg text, semibold weight and a 2 px accent underline with a 4 px offset, all from tokens.
  - In forced-colors mode, `text-decoration-color` is forced to a system color but the underline is still drawn, so the cue survives. The other links have `text-decoration: none`.
  - The e2e test asserts `text-decoration-line` for both the current link and the non-current one.
- Removing the old `outline: … transparent` rule is also an improvement. The scoped `a[aria-current]` selector out-ranked the global `:focus-visible` rule, so the current link used to have an invisible focus ring.
- The ≤720 px footer padding override is removed, so the footer has an 8 px inset at every width. The boards match.
- The PolicyDesktop search control is a copy of the existing CMP-AppShell full-row button, so its values follow established board practice.
- The 14 px gap and header padding are replaced by 12 px and 16 px.
- CSP: the change only edits scoped styles. Astro's `security.csp` hashes them at build time, and there are no hand-kept hashes.

## Minor
1. **Error line is now the paragraph's first line, not the link's line.**
   - Where: `src/modules/content/policy.ts` `runsOf` / `policyLinkErrors`.
   - Scenario: in a 3-line paragraph with an http link on line 3, the error points at line 1. Before this commit it pointed at the exact line.
   - This is acceptable, and it is what round 1 suggested. If you want the exact line, map `f.at` back to a line: count the joins before `f.at` in the joined text, and add that to `p.start`.
2. **Overlapping matches render twice.**
   - Where: `findLinks`, `policy.ts`.
   - Scenario: `[a](https://x.com/[)foo](https://y.com)` passes the build and renders two links, `a` and `)foo`. The second starts inside the first link's address, so the `[` is shown twice.
   - This is contrived and harmless, since both addresses are https.
   - Fix: in `findLinks`, skip a `LINK_LIKE` match whose index is less than the previous result's `end`.
3. **Bracketed prose like `[1](see below)` now fails the build.**
   - This matches the spec ("looks like a link"), and the message explains how to fix it.
   - There is no escape for a literal `[x](y)`. Note it in the ADR-0005 note only if it ever comes up.
4. **Misleading message for `[x](mailto:)`.** It is reported as `link "mailto:" is not https`. This is cosmetic.

## Verdict
Ready to move on. No blockers or majors remain.
