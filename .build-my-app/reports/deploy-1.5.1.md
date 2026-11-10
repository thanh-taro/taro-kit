# Deploy report — TaroKit 1.5.1

Date: 2026-11-10 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

| When | Version | Source | What |
| --- | --- | --- | --- |
| 2026-11-10 | `4bd12afe` | tag `v1.5.1-rc.1`, released as `v1.5.1` | Tool cards show every category, main first, extras folded into "+N" (D-076) |

Owner approval: D-077. Deployed straight to production with `wrangler deploy --domain tarokit.app --message "v1.5.1-rc.1"`
from the candidate's clean worktree; all 86 `dist/` files verified against the candidate checksums (34 uploaded, 51 unchanged).

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed.
- `/tools/media/` and `/tools/developer/`: the Image Annotator card lists "Developer tools, Media tools" (title in both languages).

Rollback target: v1.5.0, version `094d633a` (`npx wrangler rollback 094d633a`); no data change.
