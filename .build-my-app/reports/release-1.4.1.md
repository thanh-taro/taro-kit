# Release candidate — TaroKit 1.4.1-rc.1

Date: 2026-10-27 · Tag: `v1.4.1-rc.1` (commit `1cba94e`) · Owner approval: D-069 ("Go ahead").

## What's in it
- Fix: in the narrow menu, a tapped link opens its page in Safari on phones (MOD-Shell NavMenu closes on focus loss only when
  focus moves to an element outside the panel). Regression test: CMP-AppShell narrow menu, touch taps (WebKit iPhone and
  Chromium Pixel emulation). F019_AC3 test flake fixed (waits for the catalog filter).
- Version: `package.json` 1.4.0 to 1.4.1. No dependency, variable, secret, service, domain or data format change.

## Release notes (for the Owner)
Menu links work again when tapped on an iPhone.

## Release build
`scripts/release-build.sh v1.4.1-rc.1` in a clean worktree: 82 files, 1316 KB in `dist/`; tarball sha256 `e22959d5249c206095addd67c6f327141985524d91b915b921d202778c204bef`.

## Verification (local, release build)
| Check | Result |
|---|---|
| spec lint | 0 errors |
| `pnpm licenses:check` | ok |
| `pnpm test` | 548 passed |
| Playwright Chromium | 343 passed, 127 skipped, 0 failed |
| Playwright WebKit | 308 passed, 162 skipped, 0 failed |
| Local smoke (`wrangler dev --local`) | all passed |

## Rollback
Target v1.4.0 (Cloudflare version `1e66a70a`): `npx wrangler rollback 1e66a70a --message "rollback: <reason>"`. No data change.
