# Security & privacy QA (phase 5): whole app

Scope: main @ 6620240, the existing `dist/` (not rebuilt), git history (all local branches), `.github/workflows/`, `pnpm audit`.
Earlier per-feature audits: F-003, F-004, F-005, F-006, F-011, F-013.

**Result: no critical, high or medium findings.** There are 1 low finding and 5 informational ones, and the deploy job has requirements.

## Findings

### Critical / High / Medium
None.

### Low
**L-1 · Settings privacy copy says less than what actually happens.** `specs/30-experience/copy.md:122` (COPY-settings.privacy), rendered in `dist/settings/index.html`.
The text "Everything you do here stays in your browser, and I never see it" leaves out two things:
- the NFR-05/INV-05 exception: the theme showing is passed to embedded tools in the frame `src` and by `postMessage`;
- Cloudflare's hosting logs.

It doesn't mention that tools are separate sites, either. Risk: the privacy statement is inaccurate (PRN-03 transparency). Nothing leaks.
Fix: a spec change to COPY-settings.privacy, or a new privacy section or page that uses the draft below. The Owner must approve it.

### Informational
- **I-1 · No `Strict-Transport-Security` header.** `src/modules/security-policy/headers.ts:54-60`. The whole `.app` TLD is HSTS-preloaded, and the zone has Always Use HTTPS on (D-035), so the risk is close to none. Optional: add `max-age=63072000; includeSubDomains`.
- **I-2 · Committed Wrangler cache file, local branch only.** `spikes/sp1-sp3/node_modules/.cache/wrangler/wrangler-account.json` was committed in 69cd298. That commit is only on the local branch `spike/sp1-sp3` (not on main; there is no remote). The file holds the Cloudflare account id and name. It is not a credential. The same branch also commits about 525 `spikes/**/node_modules` files. Fix: never push that branch; delete it or rewrite it before any push.
- **I-3 · Work email in the commit history.** 101 of 149 commits have the author `a work email address`. If the repo goes public, that employer address is published. Fix: rewrite the authors (for example with a `.mailmap` or `git filter-repo`) before a public push.
- **I-4 · Checkout leaves the job token in `.git/config`.** `actions/checkout` keeps its credentials (`persist-credentials` defaults to true) while `pnpm install` runs: `ci.yml:26`, `catalog-check.yml:33,50`. The token only has `contents: read`, and pnpm blocks dependency install scripts except esbuild (`pnpm-workspace.yaml`). Fix: add `persist-credentials: false`.
- **I-5 · Sample content still published.** The repo `content/` still has samples:
  - `content/profile.yaml:12`: an `https://example.com/` link;
  - the sample tools on `sample-*.tarokit.app`, which end up in `frame-src`.

  Make sure there are no dangling DNS records for those hosts, and replace the samples before launch. `catalog-check` will block a deploy if any of them can't be reached.

## Verified clean
- **Secrets.** I searched `git log --all -p` for GitHub, Cloudflare, AWS and Bearer tokens and private keys, and found none. No `.env`, `.dev.vars` or Wrangler state is tracked on main. `dist/` holds no tokens.
- **CSP.** Each of the 15 HTML pages has one meta CSP, placed before any script:
  - `script-src 'self'` plus hashes only. Every inline script and style hash matches (checked by recomputing them). No event-handler attributes, no `style=` attributes, no `javascript:` URLs.
  - `frame-src 'none'`, except the `/t/<id>/` pages, which allow only their own tool origin.
  - `worker-src`, `connect-src` and `font-src` are `'self'`.
  - `frame-ancestors 'none'` is sent as a header, because a meta tag can't set it.
- **Other headers** in `_headers` (one global rule covers every route type):
  - `Permissions-Policy`: `clipboard-write=(self)`; every other feature is `()`. Hidden tools are not listed.
  - COOP `same-origin`, `nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Cache-Control`: `no-cache, no-transform` by default, including on `sw.js` and the manifest. `immutable` only on `/_astro/*` and `/data/catalog.*.json`, which are all hashed file names.
- **Data flow.**
  - `localStorage`: `tarokit.personal` is the store, also read by the theme head script and the home prediction script. `tarokit.probe` is a write probe that is removed right away.
  - `sessionStorage`: the one-time storage-unavailable notice flag.
  - `fetch`: only the same-origin catalog file (palette, catalog search) and the service worker's same-origin precache. The catalog-check `fetch` runs only in CI.
  - `postMessage`: the theme handoff checks both `origin` and `source`. The service worker accepts only `SKIP_WAITING`, and only from same-origin clients.
  - `window.open` and every `target=_blank` use `noopener noreferrer`.
  - Frames get `allow-scripts allow-same-origin allow-forms` and never a top-navigation token.
  - No cookies. Imported files are capped at 256 KB, and only known fields are copied out of the parsed data.
- **Third parties.** No external scripts, fonts or images. The only third-party hosts in the bundles are inert strings (the `w3.org` namespaces and Workbox's `bit.ly` warning text). RUM/Web Analytics is off (D-037). If Cloudflare ever re-enables it, the injected beacon is blocked twice: by `script-src` and by `no-transform`.
- **Dependencies.** `pnpm audit --prod` and the full `pnpm audit` both report "No known vulnerabilities found".
- **Fixtures and test hooks.** `__fixtures__` routes are injected only when `TAROKIT_FIXTURES==='1'`, and then the build goes to `dist-fixtures/` (`astro.config.ts:35,100`). `pnpm build` clears `TAROKIT_FIXTURES`, `TAROKIT_CONTENT_DIR` and `TAROKIT_PORTAL_ORIGIN`, and `check-dist-clean` passes on `dist/`. `allowHttp` exists only in the catalog-check CLI options. No hidden or fixture tool ids appear in `dist/`.
- **Earlier fixes still in place:**
  - INV-03 (no tool on the portal's own origin): `registry.ts:290`;
  - service worker serves same-origin requests only, and `sw.js`/manifest are no-cache;
  - `no-transform`;
  - dist fixture markers;
  - storage contents validated;
  - catalog-check redirects: http(s) only, and the final address must be https.
- **Workflows.** `contents: read` only. Actions pinned by SHA. No `pull_request_target`. No `${{ github.event.* }}` used inside `run:` steps.

## Deploy job requirements (`publish.yml`, not created yet)
- Trigger on push to main (or by hand) only. Use a GitHub `environment` (for example `production`) that holds `CLOUDFLARE_API_TOKEN` (scoped to Workers/static assets for this account) and `CLOUDFLARE_ACCOUNT_ID`.
- `permissions: contents: read`. Pin actions by SHA. Use `persist-credentials: false`.
- `needs: [checks, catalog-check]`, with `catalog-check.yml` called using `pre_deploy: true`. Deploy the `dist/` from `pnpm build`, which runs `check-dist-clean`.
- Pass the secrets only to the wrangler step. Never echo them.

## Privacy declaration (draft, for COPY approval)
> **Privacy**
> TaroKit has no accounts, analytics, trackers or cookies, and it collects nothing about you.
> **On your device:** your favorites, recently opened tools, days used and theme are saved in this browser's local storage. They never leave it unless you export a backup file yourself. You can export or erase them at any time in Settings.
> **Tools:** each tool is its own website. When you open one, inside TaroKit or in a new tab, you are using that site, under its own privacy policy. TaroKit tells an embedded tool only which theme you are viewing (light or dark).
> **Hosting:** TaroKit is served by Cloudflare. Like any web host, Cloudflare processes request data, such as your IP address and browser, to deliver and protect the site, under its own privacy policy. TaroKit does not use Cloudflare's analytics.

Store and privacy declaration: **no data is collected**. On-device data only: favorites, recents, days used, theme preference.
