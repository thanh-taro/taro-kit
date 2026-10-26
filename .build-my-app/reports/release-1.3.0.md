# Release candidate — TaroKit 1.3.0-rc.1

Date: 2026-10-26 · Tag: `v1.3.0-rc.1` (commit `39cbdcb`, local only) · Not deployed, not pushed.

**Status: NOT ready to deploy.** One WebKit/Safari defect in the narrow menu (see "Blocking finding"). Everything else passed.
Owner decision D-066 (cut rc and deploy) stands; the deploy waits for a fix as `v1.3.0-rc.2`, or for the Owner to accept it.

## What's in it
- **F-019 Choose a language** (D-060 to D-066): English (en-US) and Vietnamese (vi-VN). A language switch in the header (and as a
  row in the narrow menu), a language group in Settings with "Match my device", a palette action, the language passed to embedded
  tools next to the theme, Vietnamese content, privacy policy and terms (updated 2026-10-23), link previews stay English.
  Both languages are in every page; with scripts off the page shows English.
- Personal data and backups move to **schema version 2** (`preferences.language`); version 1 documents and backups migrate with no
  language (the device language is followed).
- Catalog entries hold up to 20 tags (both languages). No dependency, environment variable, secret or service changes.
- Version files: only `package.json` (1.2.0 to 1.3.0), as in 1.2.0. F-019 stays `building` in the rc (1.2.0 precedent);
  it becomes `shipped` at the final release commit, together with `specs/20-features/_index.md` and a "Released" changelog line.

## Release notes (for the Owner)
TaroKit now speaks English and Vietnamese. Pick a language with the button at the top of any page (or in the menu on a small
screen), or in Settings; "Match my device" follows your browser. Your choice stays on your device, is included in your backup, and
is passed to the tools I build so they can follow it. The privacy policy and terms are available in both languages.

## Release build
`scripts/release-build.sh v1.3.0-rc.1` from a clean worktree of the tag: 81 files, 1,092,140 bytes in `dist/` (du: 1276 KB).
- `release/tarokit-1.3.0-rc.1.tar.gz` 348,939 bytes, sha256 `321e700ecee5a31725a41ed09bcf279f1ad68e1e1a461c6a3865332886f1546d`
- `release/tarokit-1.3.0-rc.1.dist.SHA256SUMS` (81 files, all verify), 7,527 bytes
- Largest files: `preview.png` 69,126 · `index.html` 68,426 · `resume/index.html` 67,177 · `tools/index.html` 62,777 ·
  `sw.js` 21,356 (75 precache entries, 925.2 KB raw, 243.6 KB brotli) · `_headers` 871
- Budgets (built-in checks): home initial transfer 101.7 KB brotli, 42 files (html 12.8, woff2 51.9, css 7.0, js 27.9);
  fonts 51.8 KB of build-time subsets, every display and mono text covered in both languages; dist-clean ok.
- Two builds of the tag in the same folder gave identical `dist/` checksums and an identical tarball. Island `uid` attributes
  depend on the build folder's path (see deploy-1.2.0.md), and this candidate was built in a temporary worktree, so the
  deploy build will differ from these checksums in `uid`s and `sw.js` revisions unless built in the same path. Content is the same.
- `release/` is gitignored; the files are in `/Users/er_lap_mam3_016/Documents/personals/taro-kit/release/`, or rebuild from the tag.

## Verification (local)
| Check | Result |
|---|---|
| `python3 tools/spec_lint.py` | 0 errors, 0 warnings |
| `pnpm licenses:check` | ok, 770 packages, 6 registered build/dev exceptions |
| `pnpm test` (in the tag's worktree) | 548 passed (31 files) |
| Playwright Chromium | 338 passed, 127 skipped, 0 failed |
| Playwright WebKit | 302 passed, 162 skipped, **1 failed**: `F019_AC20` (narrow menu switch). Reproduced 5 of 5; real, see below |
| Playwright Firefox | 273 passed, 166 skipped, 26 failed. All 26 are the local Firefox being killed at launch (SIGTERM / closed browser), as on v1.1.1 and v1.2.0, in `a11y-qa`, `about` and `backup` specs; not re-checkable locally. CI runs Firefox with `continue-on-error` |
| CSP hashes | every inline executable script in `dist/` (83 scripts, 13 pages) has its sha256 in that page's CSP meta; no `unsafe-inline`/`unsafe-eval`; no remote script |
| Local smoke (`wrangler dev --local` of the release `dist/`, `SMOKE_BASE`) | `scripts/smoke-test.sh` all passed; `/`, `/tools/`, `/resume/`, `/settings/`, `/privacy/`, `/terms/`, `/t/json-formatter/` 200, unknown path 404 |
| Browser pass, both languages | Chromium, 7 pages x 4 modes: English device, Vietnamese device (follows device), Vietnamese chosen through the Settings switch (stored `schemaVersion: 2`, `preferences.language: "vi-VN"`), English chosen on a Vietnamese device. `html lang`, h1 and title follow the language; no Vietnamese text in English modes. Scripts off with a Vietnamese device: English on all 7 pages. No request to any host except the embedded tool frame (carries `theme` and `lang`); its "frame-ancestors" console error is expected on `localhost` |
| Link previews, sitemap, manifest | English: every page's `description`, `og:title`, `og:description` and `og:locale` en_US; manifest `lang` en-US; sitemap 11 URLs on `https://tarokit.app`, no hreflang; no Vietnamese text in meta, sitemap, robots or manifest |
| Policy dates | `/privacy/` and `/terms/` show 2026-10-23 (`content/*.yaml` `updated: 2026-10-23`) |
| Reviews | spec review 2 rounds, design 2 rounds, code review 2 rounds, security audit (no high or medium findings) |

## Blocking finding (WebKit / Safari, narrow screens)
In the narrow menu, the language row cannot be used in WebKit: pressing it closes the menu before the click completes, so the
language does not change (checked with a real mouse down, up: menu `aria-expanded` is already `false` after mouse down, focus on
`BODY`). Cause: `NavMenu.tsx` closes the menu on `focusout` when `relatedTarget` is null. Safari does not focus a button on click,
so focus leaves the first menu link for the page body. Links are unaffected (Safari focuses them). Introduced with F-019 (the
row is the first button in the menu; 1.2.0's WebKit run passed in full). Impact: Safari on macOS and iOS at 720 px and below
cannot switch language from the menu; the Settings switch and the palette still work. Chromium works. Suggested fix, for a
code change plus review: do not close on a `focusout` that starts from a pointer press inside the menu (e.g. keep the menu open
on `mousedown` or `pointerdown` inside `nav`), then re-run `F019_AC20` on WebKit. Not fixed here: phase 6 makes no code changes.

## Rollback consequence (schema version 2)
Rollback target: v1.2.0, Cloudflare version `0df943c1` (`npx wrangler rollback 0df943c1 --message "rollback: <reason>"`).
Read from the v1.2.0 code (`store.ts`, `document.ts`, `backup/import.ts`) and ADR-0010 (F-019 note):
- A user who chose a language has `schemaVersion: 2` in `tarokit.personal`. Version 1.2.0 reads it as **newer**: it still reads
  favorites, recents, theme and days used, ignores the language (the site is English-only again) and **never overwrites** the
  document. The choice is not lost: it is on disk, and returns when 1.3.x is live again.
- While on 1.2.0 such a user's changes (new favorites, recents, days used, theme) last for the visit only; they are not saved,
  and recents will not carry over. To save again on 1.2.0 they would have to import a backup or erase data in Settings, which
  replaces the document (and drops the language).
- This reaches every returning user, not only those who chose a language: 1.3.0 rewrites a stored version-1 document as version 2 on
  its first read (the stored text differs from the normalized document), and records the day used. Treat all users as affected.
- A backup exported on 1.3.0 (version 2) is rejected by 1.2.0 import as "it came from a newer version of TaroKit".
- Mitigation: roll back only for a serious fault; fix forward as 1.3.1 when possible.

## Deploy plan (phase 7, user-gated; Owner approved by D-066, but wait for the WebKit fix or an explicit acceptance)
Straight to production (D-052, D-054, no staging), as for v1.2.0, from a clean worktree of the final tag:
1. `scripts/release-build.sh v1.3.0-rc.N` (Claude can run it, it contacts nothing). Ideally in the same folder path as the candidate build.
2. **[Owner]** `npx wrangler whoami` (logged in? else `npx wrangler login`, browser).
3. **[Owner]** `WRANGLER_SEND_METRICS=false npx wrangler deploy --domain tarokit.app --message "v1.3.0-rc.N"`. This is the
   upload to production and needs the Owner's Cloudflare account; Claude does not run it.
4. Smoke: `scripts/smoke-test.sh tarokit.app` (no `SMOKE_BASE`), `pnpm catalog:check`; open `/`, `/tools/`, `/resume/`,
   `/settings/`, `/privacy/`, `/terms/` and a tool view in both languages; confirm each live tool opens with `?lang=`.
5. **[Owner]** push `main` and the tags (D-066 allows it after deploy): `git push origin main && git push origin v1.3.0 v1.3.0-rc.N`.
6. Then: tag `v1.3.0`, set F-019 `shipped` (feature file, `_index.md`), changelog "Released" line, `deploy-1.3.0.md`.
Rollback: `npx wrangler rollback 0df943c1` (consequence above).
Environment inventory and runbook: no change (no new variable, secret, service or domain).
