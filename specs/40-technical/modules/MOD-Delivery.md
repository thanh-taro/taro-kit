---
id: MOD-Delivery
title: Build, quality gates and publishing
status: draft
depends_on: [MOD-Content, MOD-Copy, MOD-Offline, MOD-SecurityPolicy, MOD-CatalogCheck, MOD-Meta]
---

## Responsibility
MOD-Delivery owns the pipeline that turns the repo into a published portal.

**Package scripts:**
- `gen`: types, tokens and copy;
- `build`: content validation, then `astro build`, then the SW build, then headers, then notices, then the font and dist-clean checks. It always targets the production origin `https://tarokit.app`;
- `build:staging`: the same build for the staging origin `https://staging.tarokit.app` (`TAROKIT_PORTAL_ORIGIN`), with the same checks. Canonical URLs, link previews, the sitemap and robots name the staging host. INV-03 still holds: a tool may be served from neither the staging nor the production origin;
- `build:samples` and `build:fixtures`: tests-only builds of fixture content into `dist-samples/` and `dist-fixtures/`, never `dist/` (adapters/tests.md);
- `test`, `e2e`, `a11y`, `perf` and `check`.

**Hosting config:** `wrangler.jsonc` (ADR-0007). An assets-only Worker `tarokit` serving `dist/`, with `not_found_handling: 404-page`, `workers.dev` and preview URLs off, and observability off (NFR-05). Its `staging` environment is a second Worker, `tarokit-staging`, for `staging.tarokit.app`. Custom domains are attached in the Cloudflare dashboard, not in the config, so the deploy token needs no Zone or DNS permission.

**GitHub Actions workflows (ADR-0007):**
- `ci.yml` for pull requests;
- `publish.yml` on push to `main`: the `ci.yml` checks (called with `workflow_call`), WebKit and Firefox e2e, the pre-deploy catalog check (`catalog-check.yml` with `pre_deploy: true`) and one build with the dist-clean gate. When all pass, the build is deployed to production with `wrangler deploy`. A manual run (`workflow_dispatch`, `target: staging | production`) deploys the chosen target; staging is deployed only this way. Deploys run only from `main`. A push deploys only once the `CLOUDFLARE_API_TOKEN` secret exists in the `production` environment; until then the production deploy is skipped with a notice, and a manual deploy without its secret fails;
- the **post-deploy smoke test** (`scripts/smoke-test.sh <host>`), after each deploy: the home page answers 200 with the `Content-Security-Policy` (`frame-ancestors`), `Strict-Transport-Security` and `Permissions-Policy` headers and no `Set-Cookie`; an unknown tool address is a 404; `sw.js` is `no-cache`; robots names the host's sitemap; the home page loads no external script. Zero third-party requests over a real page load stays a manual check;
- `catalog-check.yml` (weekly, and pre-deploy for `publish.yml`).

**Gates:**
- the license audit against ADR-0008;
- the home transfer-size pre-check (NFR-11);
- the Lighthouse budgets;
- freshness of generated files;
- `spec_lint.py`.

**Notices:** generates `/third-party-notices.txt`.

## Not responsible for
- What is checked inside each gate. Other modules own that logic.
- Account and domain setup, which is user-owned (phase 6).

## Public surface
Workflows and package scripts.

## Implements
F-014.R5 (schedule and notification wiring). It enforces NFR-10 (engine matrix) and NFR-11 (budget gate) in CI.
