# Deploy report — TaroKit 1.1.0

Date: 2026-10-20 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

## What went where

| When       | Version    | Source        | What |
| ---------- | ---------- | ------------- | ---- |
| 2026-10-20 | `c9b374c3` | tag `v1.1.0`  | D-055 (Projects page removed), D-056 (résumé skills as grouped chips), résumé content (Claude highlight, Claude AI skill, all skills at level 5) |

Deployed straight to production with the runbook's local command, `wrangler deploy --domain tarokit.app` (D-052, D-054: no staging).
24 files uploaded, 47 unchanged.

## Pre-deploy checks

- `python3 tools/spec_lint.py`: 0 errors, 0 warnings.
- `pnpm build`: content validation, fonts, home size (94.0 KB brotli), service worker (66 precache entries), dist-clean all ok.
- `pnpm test`: 462 passed. Playwright Chromium: 305 passed, 127 skipped (on the new default ports 4421/4422).

## Post-deploy checks

- `scripts/smoke-test.sh tarokit.app`: all passed.
- `pnpm catalog:check`: passed (2 tools, 2 profile links; the mailto link skipped).
- `/`, `/about/`, `/resume/`, `/now/`, `/tools/`: 200. `/projects/`: 404 (the not-found page), as D-055 intends.
- `/resume/` shows the Languages, Frameworks, Data, AI and Practices skill groups and the Claude highlight.

## Issues

None.
