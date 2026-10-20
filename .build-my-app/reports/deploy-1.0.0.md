# Deploy report — TaroKit 1.0.0

Date: 2026-10-20 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

## What went where

| When (UTC)        | Version    | Source                         | What                                                                  |
| ----------------- | ---------- | ------------------------------ | --------------------------------------------------------------------- |
| 2026-10-20 10:07  | `9aac4eda` | tag `v1.0.0-rc.1` (`8e5c40a`)  | First upload of the approved candidate (local wrangler, D-053)        |
| 2026-10-20 10:33  | `759778a8` | same `dist/` as rc.1           | Redeploy with `--domain tarokit.app`: custom domain attached; no asset changed (all 71 files matched `tarokit-1.0.0-rc.1.dist.SHA256SUMS`) |
| 2026-10-20 14:03  | `6003f97c` | `45f2209`                      | Catalog content only (F-001): JSON Formatter published, Text Case Converter added |

No staging environment (D-054): the candidate went straight to production (D-053).

## Deviations from the runbook

- **Custom domain** attached with `wrangler deploy --domain tarokit.app` instead of the dashboard (runbook step 3). The
  auto-mode guard blocked the dashboard click-through; the Owner asked for wrangler. `wrangler.jsonc` still has no
  `routes`, so the attachment lives in Cloudflare only; later deploys keep it.
- **Production is rc.1 plus a content-only catalog change** (`45f2209`: two tool entries, no code). It went through the
  full production build, the content validation, the catalog check against the live tool addresses and the unit tests
  (477 passed). `v1.0.0` is tagged at `45f2209`, the commit that is live, not at the rc commit.

## Post-deploy checks (2026-10-20)

- `scripts/smoke-test.sh tarokit.app`: all passed (200 over https, CSP with frame-ancestors, HSTS, Permissions-Policy,
  no cookies, unknown tool 404, `/sw.js` no-cache, robots.txt sitemap, no external scripts).
- `pnpm catalog:check`: passed, both tool addresses embeddable from tarokit.app.
- `/`, `/about/`, `/resume/`, `/now/`, `/tools/`, `/tools/developer/`, `/manifest.webmanifest`, `/sitemap.xml`: 200.
- Both tools checked embedded in Chrome: Text Case Converter converts input into all 11 cases; JSON Formatter
  beautifies and validates.
- **Owner:** checked the live site by hand and confirmed everything works (2026-10-20).

## Issues

- First visit to tarokit.app failed with "server IP address could not be found": the Worker was uploaded but the
  custom domain was not attached yet. Fixed by the redeploy with `--domain`.

## Monitoring

Per runbook section 6: the weekly `catalog-check` workflow, GitHub Actions history, and Cloudflare Worker metrics
(platform data only, no analytics).
