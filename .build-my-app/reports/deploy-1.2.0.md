# Deploy report — TaroKit 1.2.0

Date: 2026-10-22 · Channel: Cloudflare Workers static assets, Worker `tarokit` · Live at https://tarokit.app

## What went where

| When       | Version    | Source              | What |
| ---------- | ---------- | ------------------- | ---- |
| 2026-10-22 | `0df943c1` | tag `v1.2.0-rc.1`, released as `v1.2.0` | F-018: `/privacy/` and `/terms/`, the shell footer, link previews and site index entries; COPY-settings.privacyTools wording |

Owner approval: D-059. Deployed straight to production (D-052, D-054: no staging) with
`wrangler deploy --domain tarokit.app --message "v1.2.0-rc.1"` from a clean worktree of the tag built by
`scripts/release-build.sh v1.2.0-rc.1`. Rollback target: v1.1.1, version `4690a597`.

## Build reproducibility note
The deployed `dist/` differs from the candidate's recorded checksums only in Astro's island `uid` attributes (and so in
`sw.js` precache revisions): Astro derives them from the build folder's path. Building the tag again in a folder with the
candidate's path reproduced the candidate's checksums exactly; two builds in the same folder are identical. Page content
is the same. Follow-up: build release candidates from a fixed folder path so the deployed build matches the candidate
byte for byte.

## Post-deploy checks
- `scripts/smoke-test.sh tarokit.app`: all passed.
- `pnpm catalog:check`: passed (3 tools, 2 profile links; the mailto link skipped).
- `/`, `/privacy/`, `/terms/`, `/about/`: 200 with the footer; the Privacy and Terms links are marked current on their own
  pages; `/t/json-formatter/` has no footer.
- `/privacy/`: title "Privacy — TaroKit", `<time datetime="2026-10-22">October 22, 2026`. The sitemap lists both pages.

## Issues
None in production. Local Firefox could not run most e2e tests (the browser is killed at launch), see
`release-1.2.0.md`.
