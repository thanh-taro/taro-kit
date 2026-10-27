# Deploy report — TaroKit 1.4.1

Date: 2026-10-27 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

| When | Version | Source | What |
| --- | --- | --- | --- |
| 2026-10-27 | `7c7ccbab` | tag `v1.4.1-rc.1`, released as `v1.4.1` | Narrow-menu links open their page when tapped on phones (Safari) |

Owner approval: D-069. Deployed straight to production with `wrangler deploy --domain tarokit.app --message "v1.4.1-rc.1"`
from the candidate's clean worktree; all 82 `dist/` files verified against the candidate checksums before upload.
Rollback target: v1.4.0, version `1e66a70a` (`npx wrangler rollback 1e66a70a`); no data change.

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed. `pnpm catalog:check`: passed.
- On production, iPhone 15 (WebKit) and Pixel 7 (Chromium) emulation: tapping Menu then Tools, About me, Résumé, Now and
  Settings opens each page. A tap-through on a real iPhone is left to the Owner.

## Issues
None.
