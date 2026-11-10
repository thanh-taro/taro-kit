# Release candidate — TaroKit 1.5.1-rc.1

Date: 2026-11-10 · Tag: `v1.5.1-rc.1` (commit `a65420c`) · Owner approval: D-077.

## What's in it
- Tool cards show every category of the tool, main first, on one line; labels that don't fit fold into "+N"
  (COPY-tool.moreCategories), with every name on hover and for assistive technology (D-076, supersedes D-074;
  CMP-ToolCard, F-002.R2/AC13, NFR-07).
- Version: `package.json` 1.5.0 to 1.5.1. No dependency, variable, secret, service, domain or data format change.

## Release notes (for the Owner)
Tool cards now show every category a tool is in, like Developer tools and Media tools for the Image Annotator.

## Release build
`scripts/release-build.sh v1.5.1-rc.1` in a clean worktree: 86 files, 1460 KB in `dist/`; tarball sha256
`d15e5058f5e946069159c0e089f6be74d56fa4f5a0d7c34070fe8487b6de24ae`. All `dist/` files verified against the checksums.

## Verification (local, release tree)
| Check | Result |
|---|---|
| spec lint | 0 errors, 0 warnings; AC coverage complete |
| `pnpm licenses:check` | ok (770 packages) |
| `pnpm test` | 564 passed |
| Playwright Chromium + WebKit | 672 passed, 0 failed |
| Local smoke (`wrangler dev --local`) | all passed |

## Rollback
Target v1.5.0 (Cloudflare version `094d633a`): `npx wrangler rollback 094d633a --message "rollback: <reason>"`. No data change.
