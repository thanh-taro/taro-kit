# Deploy report — TaroKit 1.4.0

Date: 2026-10-27 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

| When | Version | Source | What |
| --- | --- | --- | --- |
| 2026-10-27 | `1e66a70a` | tag `v1.4.0-rc.1`, released as `v1.4.0` | One-line tool names, fixed-height tool cards (CMP-ToolCard sizing), new headline, résumé text and avatar |

Owner approval: D-068 ("ship it"). Deployed straight to production (D-052, D-054: no staging) with
`wrangler deploy --domain tarokit.app --message "v1.4.0-rc.1"` from the candidate's clean worktree; all 82 `dist/` files
checked against `tarokit-1.4.0-rc.1.dist.SHA256SUMS` before upload. Rollback target: v1.3.0, version `f201fc59`
(`npx wrangler rollback f201fc59`); no data format change, so a rollback has no personal-data consequence.

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed. `pnpm catalog:check`: passed (3 tools, 2 profile links; mailto skipped).
- `/`, `/tools/`, `/about/`, `/resume/`, `/t/json-formatter/` answer 200; the avatar WebP 200 (37 KB); the new headline is on home;
  "Mentor đào tạo" is gone from `/resume/`.
- Chromium and WebKit on production `/tools/` (390 px vi-VN, 1280 px en-US): every card 170 px, names one line.

## Issues
None in production. One WebKit flake in local verification (`F019_AC3`, see release-1.4.0.md).
