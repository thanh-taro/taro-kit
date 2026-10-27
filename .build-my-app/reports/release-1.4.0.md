# Release candidate — TaroKit 1.4.0-rc.1

Date: 2026-10-27 · Tag: `v1.4.0-rc.1` (commit `67adaa0`) · Owner approval: D-068 ("ship it").

## What's in it
- Tool names on one line (ellipsis, full name on hover and for assistive technology) on home and in tool cards; regular tool
  cards one fixed height with the summary at most four lines (CMP-ToolCard sizing, F-002.R7/AC9, F-007.R8/AC12, NFR-07 exception).
  Card links are now described by their summary.
- Content: new headline, résumé experience rewritten, Rising Stars role "Mentor", profile avatar (580 px square crop; 36 KB WebP).
- Testing: Firefox no longer tested (D-067); support unchanged.
- Version files: `package.json` 1.3.0 to 1.4.0. No dependency, variable, secret, service or domain change; environment inventory
  and runbook unchanged apart from the D-067 removal of the Firefox manual check.

## Release notes (for the Owner)
Tool names now stay on one line and every tool card on the Tools page is the same height. The About page has my photo, the
headline is new, and the résumé reads better.

## Release build
`scripts/release-build.sh v1.4.0-rc.1` in a clean worktree (`../taro-kit-rc`): 82 files, 1316 KB in `dist/`.
- `release/tarokit-1.4.0-rc.1.tar.gz` 390546 bytes, sha256 `422f72fdfe8e5b7e077c890e3119b80ad077429f7d6b147d23189edf06b12a81`
- `release/tarokit-1.4.0-rc.1.dist.SHA256SUMS`: all 82 files verify.
- Built-in checks: fonts ok (both languages), home initial transfer 102.0 KB brotli, dist-clean ok.

## Verification (local, release build)
| Check | Result |
|---|---|
| spec lint | 0 errors, 0 warnings |
| `pnpm licenses:check` | ok, 770 packages, 6 registered build/dev exceptions |
| `pnpm test` | 548 passed |
| Playwright Chromium | 342 passed, 127 skipped, 0 failed |
| Playwright WebKit | 306 passed, 162 skipped, 1 failed: `F019_AC3` once under full load; 3/3 alone and 111/111 for language + catalog specs x3 under load. Flake |
| Local smoke (`wrangler dev --local`, `SMOKE_BASE`) | all passed; `/`, `/tools/`, `/about/`, `/resume/`, `/t/json-formatter/` 200, unknown 404; avatar and new headline present |

## Rollback
Target v1.3.0 (Cloudflare version `f201fc59`): `npx wrangler rollback f201fc59 --message "rollback: <reason>"`. No data format
change since 1.3.0, so rollback has no personal-data consequence.
