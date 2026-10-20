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
- `publish.yml` on push to `main`: the `ci.yml` checks (called with `workflow_call`), WebKit and Firefox e2e, the pre-deploy catalog check (`catalog-check.yml` with `pre_deploy: true`) and one build with the dist-clean gate. A push never deploys (D-052). A manual run (`workflow_dispatch`, `target: staging | production`) runs the same gates and, when all pass, deploys the chosen target with `wrangler deploy`. Deploys run only from `main`, and a manual deploy without its secret fails;
- the **post-deploy smoke test** (`scripts/smoke-test.sh <host>`), after each deploy: the home page answers 200 with the `Content-Security-Policy` (`frame-ancestors`), `Strict-Transport-Security` and `Permissions-Policy` headers and no `Set-Cookie`; an unknown tool address is a 404; `sw.js` is `no-cache`; robots names the host's sitemap; the home page loads no external script. Zero third-party requests over a real page load stays a manual check;
- `catalog-check.yml` (weekly, and pre-deploy for `publish.yml`).

**Gates (ADR-0006), by where they run:**
- **Every build** (`pnpm build` and `pnpm build:staging`, so every `ci.yml` run and `publish.yml`'s `build` job): content validation, the font-subset check, the home transfer-size pre-check (NFR-11, `scripts/check-dist-size.ts`) and the dist-clean check.
- **`ci.yml`** (pull requests, and `publish.yml`'s `checks` job): `spec_lint.py`, token contrast, freshness of generated files, lint and format, `astro check`, the license audit against ADR-0008, unit tests, the build above, and Chromium e2e with axe, including the NFR-05 request and cookie test. Acceptance-criteria coverage is reported, not gated. Pull requests run no timing gate, so they stay fast.
- **`publish.yml`, before any deploy, blocking:** WebKit e2e (Firefox reports only, D-044), the pre-deploy catalog check, the build, and the **perf gates** (`pnpm perf`, the Playwright `perf` project in `tests/perf/`). The perf gates are Chromium only, one test at a time, against `astro preview` of the sample build, on the mobile lab profile (`reference-environment.md`: CDP 4× CPU, 9000/1500 Kbps, 170 ms RTT, 412 × 915). Each is the median of 5 runs, against the NFR's own target:
  - NFR-01: home's greeting and search rendered and responding (the first click on the search control that opens the palette) within 1.5 s on a first visit, and within 0.5 s on a repeat visit from the precache;
  - NFR-02, over a 500-entry catalog generated at test time through the content pipeline: the palette opens within 100 ms of the shortcut, and results update within 50 ms per keystroke. The app emits no performance marks, so latency is Event Timing input-to-next-paint, cross-checked by a frame probe; each run's value is the p75 of its interactions (SP-6).
  The `perf` project is defined only when asked for by name, so `pnpm test:e2e` and the engine runs never include it.
- **No Lighthouse CI** (user decision D-049, ADR-0006 note): the home size check and the Playwright perf rig are the performance gates.
- **After each deploy:** the post-deploy smoke test above.

**Notices:** generates `/third-party-notices.txt`.

## Not responsible for
- What is checked inside each gate. Other modules own that logic.
- Account and domain setup, which is user-owned (phase 6).

## Public surface
Workflows and package scripts.

## Implements
F-014.R5 (schedule and notification wiring). It enforces NFR-10 (engine matrix), NFR-11 (budget gate) and NFR-01 and NFR-02 (perf gates) in CI.
