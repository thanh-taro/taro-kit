# Release candidate — TaroKit 1.2.0-rc.1

Date: 2026-10-22 · Tag: `v1.2.0-rc.1` (commit `8182152`) · Not deployed.

## What's in it
- **F-018 Privacy policy and terms of use** (D-057, D-058): `/privacy/` and `/terms/` pages from the required content
  files `content/privacy.yaml` and `content/terms.yaml` (Owner-approved text, updated 2026-10-22); a quiet shell footer
  linking both on every portal page except the tool view, with the current page underlined; link previews and site
  index entries; the build fails on missing or invalid policies and on non-https links (INV-02).
- COPY-settings.privacyTools now says each tool tells you how it handles your data.
- Since v1.1.1 there are no dependency changes (only the version in package.json).

## Release notes (for the Owner)
TaroKit now has a privacy policy and terms of use, linked from the bottom of every page. In short: TaroKit collects
nothing, your favorites, recents and theme stay on your device, the tools I build process your files on your device,
and Cloudflare hosts the sites without visitor analytics.

## Release build
`scripts/release-build.sh v1.2.0-rc.1` from a clean worktree of the tag: 75 files, 1044 KB in `dist/`.
- `release/tarokit-1.2.0-rc.1.tar.gz` sha256 `d99352cfeb3e3933a6a9b885fac4e4b675457aedb56647a0250d425dbdd69d74`
- `release/tarokit-1.2.0-rc.1.dist.SHA256SUMS` (all 75 files verify)
- Reproducible: a second build of the tag gave an identical `dist/` checksum list.
(`release/` is gitignored; rebuild from the tag to get the artifacts again.)

## Verification (local)
| Check | Result |
|---|---|
| `python3 tools/spec_lint.py` | 0 errors, 0 warnings; `--coverage tests/`: no AC without a test |
| `pnpm test` | 488 passed |
| Playwright Chromium | 316 passed, 127 skipped |
| Playwright WebKit | all passed (first full run) |
| Playwright Firefox | 261+ passed; the failures are the local Firefox being killed at launch (SIGTERM), also on v1.1.1. One assertion failure, F012_AC8 (theme hand-off timing, untouched by F-018), could not be re-checked locally for the same reason. CI runs Firefox with `continue-on-error`. |
| `pnpm build` checks | content, fonts, home size (94.4 KB brotli), service worker, dist-clean: ok |
| `pnpm licenses:check` | ok, 770 packages, 6 registered build/dev exceptions |
| Local smoke (`wrangler dev --local` of the release `dist/`, `SMOKE_BASE` smoke test) | all passed; `/privacy/`, `/terms/` 200; sitemap lists both; no footer on the tool view |
| Reviews | spec review 2 rounds, code review 2 rounds, design audit 1 round + fixes: converged |

## Deploy plan (phase 7, needs the Owner's approval)
Straight to production per D-054 (no staging environment), with the runbook's local command from a clean worktree of the
tag, as for v1.1.0 and v1.1.1: `scripts/release-build.sh v1.2.0-rc.1`, then
`wrangler deploy --domain tarokit.app --message "v1.2.0-rc.1"`. Afterwards: `scripts/smoke-test.sh tarokit.app`,
`pnpm catalog:check`, check `/privacy/`, `/terms/` and the footer live. Rollback: `npx wrangler rollback` to the v1.1.1
version (`4690a597`). Then tag `v1.2.0`, set F-018 `shipped`, write `deploy-1.2.0.md`.
