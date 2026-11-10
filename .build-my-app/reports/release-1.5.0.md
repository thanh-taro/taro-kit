# Release candidate — TaroKit 1.5.0-rc.1

Date: 2026-11-10 · Tag: `v1.5.0-rc.1` (commit `bcdfd67`) · Owner decision: D-075 (release now, Clip Maker hidden).

## What's in it
- Embedded tools can ask for the `dialogs` permission (leave-page warning, alerts, confirmations, print) and the
  `share` permission (the device's share menu); focus moves into a tool when it says it is ready (RULE-10, F-003.R9,
  D-070 to D-072).
- A tool can belong to more than one category: listed on each category page and under each catalog heading, once in
  search, palette and home, labelled with its main category; tiles count it in each (INV-07, D-073, D-074).
- Catalog: Image Annotator (live 2026-11-10) in Developer tools and Media tools. Clip Maker's entry is hidden until the
  tool is live; Media tools now holds the Image Annotator only.
- Version: `package.json` 1.4.1 to 1.5.0. No dependency, variable, secret, service, domain or data format change.

## Release notes (for the Owner)
New: Image Annotator, in Developer tools and Media tools. Tools can now sit in more than one category, and embedded
tools that need it can warn before you leave, print, or share.

## Release build
`scripts/release-build.sh v1.5.0-rc.1` in a clean worktree: 84 files, 1440 KB in `dist/`; tarball sha256
`ea11509657d0087e2ed3e10c4655e191e7fe983142ac0c62ab83cbaa296a5c45`. All `dist/` files verified against
`release/tarokit-1.5.0-rc.1.dist.SHA256SUMS`.

## Verification (local, release tree)
| Check | Result |
|---|---|
| spec lint | 0 errors, 0 warnings; AC coverage complete |
| `pnpm licenses:check` | ok (770 packages) |
| `pnpm test` | 562 passed |
| Playwright Chromium + WebKit | 668 passed, 292 skipped, 0 failed |
| Local smoke (`wrangler dev --local`, `scripts/smoke-test.sh`) | all passed; `/tools/media/` lists Image Annotator; `/t/clip-maker/` is 404 |
| Catalog check | image-annotator PASS; clip-maker not live (entry hidden) |

## Known, accepted
- Image Annotator's source link (github.com/thanh-taro/image-annotator) is 404; the portal does not show source links (D-075).

## Rollback
Target v1.4.1 (Cloudflare version `7c7ccbab`): `npx wrangler rollback 7c7ccbab --message "rollback: <reason>"`. No data change.
