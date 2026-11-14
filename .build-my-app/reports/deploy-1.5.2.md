# Deploy report — TaroKit 1.5.2

Date: 2026-11-14 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

| When | Version | Source | What |
| --- | --- | --- | --- |
| 2026-11-14 | `e0938d3b` | tag `v1.5.2-rc.1`, released as `v1.5.2` | New Est Rouge role on the résumé, About and Now (content only) |

Owner approval: D-078. Pre-publish catalog check passed (4 tools, 2 profile links; Clip Maker skipped, hidden). Deployed straight
to production with `wrangler deploy --domain tarokit.app --message "v1.5.2-rc.1"` from the candidate's clean worktree; all 86
`dist/` files verified against the candidate checksums (22 uploaded, 63 unchanged).

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed.
- `/resume/`, `/about/` and `/now/` show the new role, in English and Vietnamese.

Rollback target: v1.5.1, version `4bd12afe` (`npx wrangler rollback 4bd12afe`); no data change.
