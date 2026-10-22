# Deploy report — TaroKit 1.1.1

Date: 2026-10-22 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

## What went where

| When       | Version    | Source        | What |
| ---------- | ---------- | ------------- | ---- |
| 2026-10-22 | `4690a597` | tag `v1.1.1`  | Content-only catalog change: Data File Viewer added (F-001; no spec change) |

Deployed straight to production with `wrangler deploy --domain tarokit.app` (D-052, D-054: no staging), from a clean
worktree of the tag built by `scripts/release-build.sh v1.1.1` (tarball sha256 `a9f56eae…d33a4`).
26 files uploaded, 46 unchanged.

## Pre-deploy checks

- `python3 tools/spec_lint.py`: 0 errors, 0 warnings.
- `pnpm build`: content validation, fonts, home size (94.2 KB brotli), service worker (67 precache entries), dist-clean all ok.
- `pnpm test`: 462 passed. Playwright Chromium: 305 passed, 127 skipped.
- `pnpm catalog:check`: passed (3 tools, 2 profile links; the mailto link skipped).

## Post-deploy checks

- `scripts/smoke-test.sh tarokit.app`: all passed.
- `pnpm catalog:check`: passed.
- `/tools/developer/` lists Data File Viewer; `/t/data-file-viewer/`: 200.

## Issues

- The first release commit picked up another session's staged, uncommitted F-018 (privacy and terms) spec work. It was
  undone before anything was pushed or deployed, and that work was left staged as it was. The release was rebuilt from a
  separate worktree so it holds only the version bump.
