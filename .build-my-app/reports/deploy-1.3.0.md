# Deploy report — TaroKit 1.3.0

Date: 2026-10-26 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

## What went where

| When       | Version    | Source              | What |
| ---------- | ---------- | ------------------- | ---- |
| 2026-10-26 | `f201fc59` | tag `v1.3.0-rc.2`, released as `v1.3.0` | F-019: English and Vietnamese, header/menu/settings/palette language switch, Vietnamese content and policies, language handed to embedded tools, personal-data schema v2 |

Owner approval: D-066. Deployed straight to production (D-052, D-054: no staging) with
`wrangler deploy --domain tarokit.app --message "v1.3.0-rc.2"`. The deployed `dist/` is the verified candidate artifact
itself (`release/tarokit-1.3.0-rc.2.tar.gz`, sha256 `0c2daf36…f967`; all 81 files checked against
`tarokit-1.3.0-rc.2.dist.SHA256SUMS` before upload), placed in a clean worktree of the tag for `wrangler.jsonc`.
A rebuild of the tag in another folder differed only in island uids and `sw.js` revisions, so it was not used.
Rollback target: v1.2.0, version `0df943c1` (see the runbook's rollback note: 1.2.0 reads schema v2 data as "newer";
prefer fixing forward).

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed.
- `pnpm catalog:check`: passed (3 tools, 2 profile links; the mailto link skipped).
- Built HTML defaults to `<html lang="en-US" data-lang="en-US">` and carries both languages; `/privacy/` shows `2026-10-23`;
  the manifest `lang` is en-US.
- Real browsers (Chromium and WebKit, device locale vi-VN) on production: Home is vi-VN with the Vietnamese title and
  navigation; `/t/json-formatter/` frames `https://json-formatter.tarokit.app/?theme=light&lang=vi-VN`.
- All three tools answer 200 with `?theme=dark&lang=vi-VN`. Whether each tool applies the language is up to its own
  project (tool contract, language hand-off).

## Issues
None in production. Local Firefox e2e still can't launch (known, see `release-1.3.0.md`).
