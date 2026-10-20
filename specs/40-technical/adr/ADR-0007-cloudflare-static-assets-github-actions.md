---
id: ADR-0007
title: Host on Cloudflare Workers static assets, build and publish from GitHub Actions
status: accepted
date: 2026-10-13
supersedes: []
---

## Context
The hosting and CI requirements:
- **Free static hosting** (D-001) with **custom response headers**. The portal needs `frame-ancestors` and `Permissions-Policy`, which can't be set from a meta tag (ADR-0009, NFR-08). It also needs no-cache rules for the service worker.
- **A real 404** status and page for unknown and hidden tool addresses (F-003.R7, F-015.R4).
- **A custom apex domain with subdomains for tools** (ADR-0001). The site must not sit under a public-suffix host such as `*.pages.dev` or `*.github.io`, because every subdomain there is a separate site. That would split storage and break F-003.R8.
- **The catalog check must block publishing** (F-014.R1, F-014.R2) **and run weekly**, notifying the Owner through the same channel as a failed publish (F-014.R5).
- **No cookies, scripts or beacons** injected by the host (NFR-05).

## Decision
- **Hosting:** a Cloudflare **Workers static-assets** project with assets only and no Worker script, deployed with `wrangler` (MIT or Apache-2.0).
  - `not_found_handling` is set to `404-page`.
  - A generated `_headers` file in `dist/` carries the security headers (MOD-SecurityPolicy) and cache rules: immutable for hashed assets, `no-cache` for HTML, `sw.js` and the manifest.
  - The apex and tool subdomains live in one Cloudflare DNS zone. Tools can be hosted anywhere and pointed at their subdomain.
- **Zone hygiene (required for NFR-05):** turn off everything the host could inject or set:
  - Web Analytics auto-injection;
  - Email Address Obfuscation;
  - Rocket Loader;
  - Zaraz;
  - Bot Fight Mode, which sets cookies;
  - any "speed" features that rewrite HTML.

  A post-deploy smoke test verifies there are zero third-party requests and no `Set-Cookie`.
- **Source and CI: GitHub with GitHub Actions.**
  - `ci.yml` runs on pull requests. It covers:
    - spec lint;
    - typecheck and lint;
    - unit tests;
    - the build, which includes content validation (F-001);
    - Chromium e2e and axe;
    - the size pre-check;
    - the license audit (ADR-0008).
  - `publish.yml` runs on push to `main`. It runs everything above, then the full three-engine e2e, the Playwright perf rig (Lighthouse CI dropped, D-049) and the **catalog check** (MOD-CatalogCheck). Only if every job passes does `wrangler deploy` run. Cloudflare's own Git auto-deploy stays **off**, so the check gates the publish.
  - `weekly-check.yml` runs on `schedule` (weekly) and `workflow_dispatch`. It runs the catalog check against `main`, which is the published content. A failure fails the run. GitHub's failed-workflow email is the notification channel shared with failed publishes. It never deploys.
- Secrets are limited to a scoped Cloudflare API token and the account id, stored as GitHub Actions secrets.

## Alternatives considered
- **GitHub Pages.** Free and simple, but it has no custom headers. That leaves no `frame-ancestors`, no `Permissions-Policy`, and CSP only via meta. NFR-08 can't be fully met.
- **Cloudflare Pages.** Still supported and nearly equivalent (`_headers`, 404 handling). Workers static assets is the platform Cloudflare is steering new projects toward. Either works, and moving between them is a config change.
- **Netlify.** It supports `_headers` and has good DX, but the free plan is credit-metered. It is a fine fallback.
- **Vercel Hobby.** It supports headers, but its terms restrict the free tier to non-commercial use. It is a fine fallback for a personal site.
- **Self-hosted server or object storage plus a CDN.** Not free and not boring for this scale.

## Consequences
- A domain and a Cloudflare account are required before release. These are user decisions (phase 6).
- GitHub disables scheduled workflows in public repos after 60 days without repository activity. The weekly check (F-014.R5) can silently stop. Mitigation: a monthly reminder in the Owner's routine, or a re-enable step in the release checklist. This is recorded as a known risk.
- In private repos, Actions minutes are metered: 2,000 per month free. The full matrix fits within that at the expected commit rate, but it should be watched.
- Hosting is plain files plus `_headers`, so leaving Cloudflare means regenerating headers in the new host's format (MOD-SecurityPolicy owns the format).

## Note from the scaffold (2026-10-14)
- The scheduled check workflow is `.github/workflows/catalog-check.yml` (weekly plus pre-deploy), not `weekly-check.yml`.

## Note for the v1 release: staging (2026-10-20, D-046)
- A temporary staging site, `https://staging.tarokit.app`, is its own assets-only Worker (`tarokit-staging`, the `staging` environment in `wrangler.jsonc`). It is built with `pnpm build:staging` and deployed only by hand (`publish.yml`, `workflow_dispatch` with `target: staging`). It is not a `*.workers.dev` or preview URL, which this ADR rules out for the portal.
- It exists for the manual checks before go-live (D-044) and is removed after launch.
- Production is unchanged (D-047): every green push to `main` deploys to production, as decided above.
