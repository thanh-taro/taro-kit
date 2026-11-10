# Deploy report — TaroKit 1.5.0

Date: 2026-11-10 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

| When | Version | Source | What |
| --- | --- | --- | --- |
| 2026-11-10 | `094d633a` | tag `v1.5.0-rc.1`, released as `v1.5.0` | Image Annotator in Developer and Media tools; tools in several categories; `dialogs`/`share` permissions and focus on ready; Clip Maker hidden |

Owner approval: D-075 (release without Clip Maker) and the deploy confirmation (2026-11-10). Deployed straight to
production (no staging) with `wrangler deploy --domain tarokit.app --message "v1.5.0-rc.1"` from the candidate's clean
worktree; all 84 `dist/` files verified against the candidate checksums before upload (30 uploaded, 53 unchanged).

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed (200, CSP with frame-ancestors, HSTS, Permissions-Policy, no cookies,
  unknown tool 404, sw.js no-cache, robots/sitemap, no external scripts).
- `/tools/media/` and `/tools/developer/` 200 and list Image Annotator; `/t/image-annotator/` 200, frames
  https://image-annotator.tarokit.app/ with the declared sandbox and `allow="clipboard-write"`; `/t/clip-maker/` 404.
- Owner browser check suggested: open https://tarokit.app/t/image-annotator/ and use the tool once.

Rollback target: v1.4.1, version `7c7ccbab` (`npx wrangler rollback 7c7ccbab`); no data change.
