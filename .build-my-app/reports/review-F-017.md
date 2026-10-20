# Code review: F-017 Read the Owner's résumé (2026-10-20)

Branch `worktree-agent-a98e167a7e45e13c9` vs main 419c69f. `spec_lint --coverage tests`: 0 ACs without tests, 0 errors. `vitest tests/unit/resume.test.ts`: 23/23 pass. Real `content/` validates.

## Blocker
none

## Major
**M1. With the Résumé item, the offline/update pill pushes the settings button out of the bar at every width from 1120 px up.**
`src/modules/shell/AppShell.astro:247-270` and the pill rules at `:322-342`. I measured the sample build in Chromium: /about/ at 1440 px, offline. The `.end` group ends at 1287 px and the bar ends at 1264 px, so `scrollWidth - clientWidth = 24`. Remove the Résumé item and the overflow is 0. The bar is capped in width, so going wider doesn't help. The new NFR-07 test (`tests/e2e/resume.spec.ts:183`) only runs online.
Fix: when `[data-nav='long']`, apply the `max-width:1119px` behaviour (hide the pill and show `.tk-status--notice`) at every width, or tighten the nav items when a pill is showing. Add the offline state, and the update state, to the width-sweep test.

**M2. The AC4 "College" level check passes even when the level isn't shown.**
`tests/unit/resume.test.ts:204` matches `'College'` inside the institution "Fixture College". `tests/e2e/resume.spec.ts:72` does the same with "Sample College". If you delete `{e.level && …}` (`ResumeView.astro:71`), both tests still pass.
Fix: assert on `.level`'s text (`<span class="level">College</span>`), or rename the institution to something without "College".

## Minor
**m1.** `tests/e2e/resume.spec.ts:130` (AC8): the FX build never had a résumé, so this test passes without the feature. The unit test for an empty résumé carries AC8. That's fine, but say so in a comment.

## Checked, OK
- INV-08 and the "experience 3"/"education 1" naming, with the error on the end month's line.
- An empty file or empty sections count as no résumé.
- Nav, palette, About, sitemap and meta are gated on `Registry.resume`. The precache is a glob, so `/resume/index.html` is in `sw.js`.
- Months are formatted in UTC by `monthLabel`, and `<time datetime=YYYY-MM>` is set.
- é is in the Unbounded Latin cmap. Fonts total about 52 KB, under the 80 KB budget. OFL subsetting needs no new notice.
- No new inline scripts and no `set:html`: content is rendered as text.
- Compact and narrow shell are unaffected.
