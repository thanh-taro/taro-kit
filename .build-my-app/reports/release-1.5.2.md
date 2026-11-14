# Release candidate — TaroKit 1.5.2-rc.1

Date: 2026-11-14 · Tag: `v1.5.2-rc.1` (commit `fe7a918`) · Owner approval: D-078.

## What's in it
- Content only (no spec change): the résumé's Est Rouge role "Fullstack AI-Native engineer and technical leader" now runs July 2023 to
  November 2026. A new current Est Rouge role, "Technical leader and AI Application Planned Delivery Unit leader", starts
  November 2026. The About bio and the Now note name the new role, and Now's `updated` date is 2026-11-14.
- Clip Maker stays hidden: clip-maker.tarokit.app doesn't resolve yet, so the catalog check (F-014.R1) would stop the publish.
- Version: `package.json` 1.5.1 to 1.5.2. No dependency, variable, secret, service, domain or data format change.

## Release notes (for the Owner)
Updated résumé, About and Now with Taro's new role at Est Rouge.

## Release build
`scripts/release-build.sh v1.5.2-rc.1` in a clean worktree: 86 files, 1468 KB in `dist/`; tarball sha256
`2c807a91f08dde892a91fcdfedfc1c20e1c076253e638cb23ee921e96f23e72b`. All `dist/` files verified against the checksums.

## Verification (local, release tree)
| Check | Result |
|---|---|
| spec lint | 0 errors, 0 warnings |
| `pnpm licenses:check` | ok (770 packages) |
| `pnpm test` | 564 passed |
| Playwright Chromium + WebKit | 669 passed, 3 failed under full parallel load (two CMP-AppShell narrow-menu tests and the F-017 six-item bar width test, Chromium); all 3 passed on rerun, so they are timing flakes and not caused by this change |
| Local smoke (`wrangler dev --local`) | all passed; `/resume/` shows the new role |

## Rollback
Target v1.5.1 (Cloudflare version `4bd12afe`): `npx wrangler rollback 4bd12afe --message "rollback: <reason>"`. No data change.
