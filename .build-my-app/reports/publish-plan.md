# Publish plan: `publish.yml`, wrangler config, version (TaroKit v1.0.0, M-1)

Prepared 2026-10-20, main at 8a7c4d2. **Updated 2026-10-20 for D-045 to D-048 and implemented** (branch `worktree-agent-a9b2dfd7cc3a69107`): production deploys on every green push to `main` (ADR-0007 as written, D-047), with no `PRODUCTION_DEPLOY_ENABLED` variable and no required reviewer; staging is a separate Worker deployed only by hand (D-046); wrangler is pinned at 4.147.0 (DEP-45); version 1.0.0, no tag (D-048). Where the text below differs from the files, the files win. This was a spec for Claude to implement after approval. Nothing here was written outside `.build-my-app/reports/`. Companion: `release-checklist.md`.
Sources: `ci.yml`, `catalog-check.yml`, `security-qa.md` (Deploy job requirements), ADR-0007, MOD-Delivery, `package.json`, `pnpm-workspace.yaml`.

## 1. What exists and what is missing

| Item | State |
|---|---|
| `.github/workflows/ci.yml` (PR gate, Chromium) | exists; triggers `pull_request`, `push` (not main), `workflow_dispatch`; **no `workflow_call`**; job `checks` |
| `.github/workflows/catalog-check.yml` | exists; `workflow_call` with `inputs.pre_deploy` (boolean, default true); jobs `weekly`, `pre-deploy`; `permissions: contents: read`; trailing placeholder comment for the deploy step |
| `.github/workflows/publish.yml` | **missing** (this plan) |
| `wrangler` | **not installed**: absent from `package.json` and `pnpm-lock.yaml`; registered as DEP-28 `^4` (and DEP-39 workerd), approved, scope dev/ci |
| `wrangler.jsonc` | **missing** |
| `package.json` `version` | **missing** (private package, no version) |
| Git tags | **none** (`git tag` is empty); **no remote** |
| `build:staging` script | **missing** (`pnpm build` clears `TAROKIT_PORTAL_ORIGIN`) |
| Post-deploy smoke test | **missing** (MOD-Delivery, ADR-0007) |
| Lighthouse CI and the home transfer-size pre-check (NFR-11) | **missing** (no config, no script). Not required for M-1; perf was measured by hand in `perf-qa.md` (home about 96 KB brotli vs 200 KB). Recommend recording as an M-2 item. |
| Firefox in CI | untested (Playwright project exists; Firefox could not launch in the sandbox) |
| `.gitignore` | lacks `.wrangler/`, `.dev.vars*`, `.env*`, `dist-samples/` (if C-1 adds it) |
| Tests that read `content/` | 11 files; they break when samples go. See `release-checklist.md` C-1. **Must land before `publish.yml` can pass.** |
| `LICENSE` | none; fine for a private repo |

Dependency effect of adding wrangler: `pnpm licenses:check` may flag new transitive packages; `minimumReleaseAge: 4320` (3 days) may hold back the newest wrangler; `workerd` has an install script that `allowBuilds` blocks (esbuild only). The deploy job installs with `--ignore-scripts`; the build job does not need wrangler at all. Verify `pnpm exec wrangler --version` and `pnpm exec wrangler deploy --dry-run` work locally.

## 2. Files to change (Claude, after approval)

1. `package.json`: `"version": "1.0.0"`, devDependency `"wrangler": "^4"`, script `"build:staging"` (below). Regenerate `pnpm-lock.yaml`.
2. `wrangler.jsonc` (below).
3. `.github/workflows/ci.yml`: add `workflow_call:` under `on:` (one line). Keeps one definition of the PR gate; publish.yml calls it.
4. `.github/workflows/publish.yml` (below).
5. `.github/workflows/catalog-check.yml`: delete the trailing "Placeholder for publish.yml" comment.
6. `.gitignore`: add `.wrangler/`, `.dev.vars`, `.dev.vars.*`, `.env`, `.env.*`.
7. `specs/40-technical/adr/ADR-0007...` note and `MOD-Delivery`: record the deviations in section 7 (spec change, user approval, then lint).

## 3. `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tarokit",
  "compatibility_date": "2026-10-20",
  "workers_dev": false,        // no *.workers.dev origin (ADR-0007: it would be a public-suffix duplicate site)
  "preview_urls": false,
  "observability": { "enabled": false },   // no logs/analytics beyond the platform (NFR-05, D-037)
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"       // serves /404.html with a real 404 (F-003.R7, F-015.R4)
  },
  // No "main": assets only, no Worker script (ADR-0007).
  // No "routes": the custom domains are attached in the dashboard (checklist U-11), so the CI token never needs Zone or DNS permissions.
  "env": {
    "staging": {
      "name": "tarokit-staging",
      "workers_dev": false,
      "preview_urls": false,
      "observability": { "enabled": false },
      "assets": { "directory": "./dist", "not_found_handling": "404-page" }
    }
  }
}
```
- `_headers` is generated into `dist/` by the build (MOD-SecurityPolicy) and read by Workers static assets. `html_handling` stays default (the site uses `trailingSlash: 'always'`; verify `/about` redirects to `/about/` on staging).
- `dist/` is 77 files and 1.1 MB, far below the static-assets limits.
- Staging uses `./dist` too: each workflow job builds its own target into its own runner; locally rebuild before switching target.
- Verify before the first deploy: `pnpm exec wrangler deploy --dry-run` and `--dry-run --env staging` (no account needed); confirm that `assets` set inside `env.staging` is honored (if wrangler inherits instead, drop the duplicate).
- If you prefer config-as-code for domains later, add `"routes": [{ "pattern": "tarokit.app", "custom_domain": true }]` and widen the token with `Zone / Workers Routes / Edit` and `Zone / DNS / Edit`. Not recommended.

## 4. `build:staging` (package.json)

```
"build:staging": "pnpm run gen && TAROKIT_CONTENT_DIR= TAROKIT_PORTAL_ORIGIN=https://staging.tarokit.app pnpm run content:validate && TAROKIT_FIXTURES= TAROKIT_CONTENT_DIR= TAROKIT_PORTAL_ORIGIN=https://staging.tarokit.app astro build && pnpm run sw:build && node scripts/check-dist-fonts.ts && node scripts/check-dist-clean.ts"
```
It is `pnpm build` with the origin set. Registry rule: the portal origin may not equal a tool's origin and the production origin stays refused for tools (INV-03, `registry.ts:295`). After the build, the workflow asserts the staging dist names no production origin (step in `build`).

## 5. `publish.yml` spec

### Triggers
```yaml
on:
  push:
    branches: [main]            # security-qa: main only
  workflow_dispatch:
    inputs:
      target:
        type: choice
        options: [staging, production]
        default: staging
```
No `pull_request`, no `pull_request_target`, no tag trigger, no `schedule` (the weekly check stays in `catalog-check.yml`). Deployments run only when `github.ref == 'refs/heads/main'`.

### Top level
```yaml
name: publish
permissions:
  contents: read                # nothing else anywhere; no id-token, no write scopes
concurrency:
  group: publish
  cancel-in-progress: false     # never cancel a deploy half way
env:
  ASTRO_TELEMETRY_DISABLED: '1'
```

### Jobs (all `runs-on: ubuntu-24.04`, each with `timeout-minutes`)

1. **`checks`**: `uses: ./.github/workflows/ci.yml` (needs the `workflow_call` trigger). Spec lint, token contrast, gen freshness, lint, `astro check`, licenses, unit tests, build, fonts check, Chromium e2e + axe. `permissions: contents: read`.

2. **`e2e-engines`** (needs nothing; runs in parallel): matrix `project: [webkit, firefox]`. Steps: checkout, pnpm setup, node 24, `pnpm install --frozen-lockfile`, python venv + `requirements-build.txt`, `pnpm build`, `pnpm exec playwright install --with-deps ${{ matrix.project }}`, `pnpm exec playwright test --project=${{ matrix.project }}`. `continue-on-error: ${{ matrix.project == 'firefox' }}` until Firefox has been green once on GitHub (it is also a manual check, D-044); then make it required. WebKit is required (278 to 279 passing locally; one unreproduced flake, rely on `retries: 1` in CI).

3. **`catalog-gate`**:
```yaml
  catalog-gate:
    permissions:
      contents: read            # the called workflow declares contents: read; the caller must grant at least that
    uses: ./.github/workflows/catalog-check.yml
    with:
      pre_deploy: true          # F-014.R1/R2: this is the blocking mode, never the weekly one
```
No secrets are passed (`secrets:` is omitted, the called workflow uses none). The gate always checks against the production portal origin, so a tool must allow `https://tarokit.app`, even when you deploy staging.

4. **`build`**: needs `[checks]`. No secrets, no environment. Steps:
   - checkout (`persist-credentials: false`), pnpm, node, `pnpm install --frozen-lockfile`, python venv;
   - target is read from `github.event.inputs.target`, default for `push` is `production`: `if [ "$TARGET" = staging ]; then pnpm build:staging; else pnpm build; fi` (both include the fonts check and `check-dist-clean`, the **dist-clean gate**);
   - staging only: `! grep -rIl "https://tarokit.app" dist --include='*.html' --include='*.xml' --include='*.webmanifest' --include='robots.txt'` (no production origin in a staging build);
   - production only: `grep -q 'https://tarokit.app/' dist/index.html` and `! grep -rl 'sample-' dist` (no sample content), and `test -f dist/_headers dist/404.html dist/sw.js`;
   - `actions/upload-artifact` of `dist/` as `dist-${target}`, `retention-days: 7`, `if-no-files-found: error`.
   Jobs `build` and `deploy-*` use the same artifact, so what was gated is what is deployed.

5. **`deploy-staging`**: `needs: [checks, e2e-engines, catalog-gate, build]`; `if: github.event_name == 'workflow_dispatch' && inputs.target == 'staging' && github.ref == 'refs/heads/main'`; `environment: { name: staging, url: https://staging.tarokit.app }`.
   - Require `needs.e2e-engines.result == 'success'`; with `continue-on-error` the Firefox leg does not change the job result.
   - A `push` builds production only, so a staging deploy comes only from `workflow_dispatch` with `target=staging`, which makes `build` run `pnpm build:staging`.

6. **`deploy-production`**: `needs` the same; `if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || inputs.target == 'production')`; `environment: { name: production, url: https://tarokit.app }`, no required reviewer (D-047). Its first step checks the secrets: when `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID` is missing, a **push** skips the remaining steps with a `::notice::` (the run stays green, the smoke job is skipped through the job output `deployed`), and a **manual** run fails with an `::error::`. Skipping on push is chosen because the repo is pushed and staging is checked before the production secret exists (checklist U-10 to U-17); failing then would turn every push red and send failure emails for an expected state. `deploy-staging` always fails when its secrets are missing (it only runs by hand).

Both deploy jobs share these steps:
```yaml
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile --ignore-scripts     # wrangler only; no lifecycle scripts run next to the token
      - uses: actions/download-artifact@<SHA> # vX.Y.Z  (PIN-TODO, see below)
        with:
          name: dist-production       # dist-staging in deploy-staging
          path: dist
      - name: Deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec wrangler deploy --message "${GITHUB_SHA}"      # staging: add --env staging
```
- The secrets appear only in the `Deploy` step's `env`. No `echo`, no `set -x`, no token in `run:` text. The environment holds the secrets (`gh secret set ... --env production`).
- `--message` support in `wrangler deploy` is to be confirmed with `--help`; drop it if unsupported.
- The wrangler command deploys the downloaded `dist/` using `wrangler.jsonc` from the checkout. `workers_dev` and `preview_urls` stay false.
- Cloudflare's own Git integration (Workers Builds) stays off (ADR-0007).

7. **`smoke`** (after each deploy): `needs: [deploy-production]` and the same for staging; no secrets; checks with `curl` only, host from the target (`tarokit.app` or `staging.tarokit.app`):
```bash
set -euo pipefail
H="https://${HOST}"
curl -fsS -D headers.txt -o index.html "$H/"
! grep -i '^set-cookie:' headers.txt                         # NFR-05: no cookies
grep -qi '^content-security-policy:.*frame-ancestors' headers.txt
grep -qi '^permissions-policy:' headers.txt
grep -qi '^strict-transport-security:' headers.txt
test "$(curl -s -o /dev/null -w '%{http_code}' "$H/t/does-not-exist/")" = 404
curl -fsSI "$H/sw.js" | grep -qi 'cache-control: no-cache'
curl -fsS "$H/robots.txt" | grep -q "Sitemap: $H/sitemap.xml"
! grep -E '<script[^>]+src="https?://' index.html            # no external scripts
```
Zero third-party requests across a real page load stays a manual DevTools check (checklist U-14 step 8). A failed smoke test does not roll back automatically; the failed-workflow email tells the Owner, who rolls back (checklist U-17).

### Pinned actions
Match `ci.yml`: full 40-character SHA plus a trailing `# vX.Y.Z` comment (DEP-29):
- `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`
- `pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0`
- `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0`
- **PIN-TODO** `actions/upload-artifact` and `actions/download-artifact`: no SHA is recorded in the repo, and this plan did not look them up (no external access). When Claude writes the file it must resolve the release SHAs (for example `gh api repos/actions/upload-artifact/git/ref/tags/<tag> --jq .object.sha`, which contacts GitHub and needs your OK) and add them to the registry (DEP-29). If you prefer no new actions: drop the artifact, and let each deploy job run `pnpm build` itself (add the python venv; accept that the deployed build is the second build of the same commit).
- No third-party deploy action (such as `cloudflare/wrangler-action`): the pinned `pnpm exec wrangler` from the lockfile is used instead.

### Least-privilege summary
Workflow `contents: read`; no job requests more. Secrets only in the two deploy jobs' `Deploy` step, from GitHub environments `staging` and `production`. `persist-credentials: false` on every checkout. No `pull_request_target`. No `${{ github.event.* }}` or `inputs` interpolated into `run:` (the target is passed through `env: TARGET: ${{ inputs.target }}`). Deploy jobs install with `--ignore-scripts`. Token scope: Account / Workers Scripts / Edit only (checklist U-9), 12-month expiry. Branch gate: deploys only from `main`.

## 6. Version numbering

Current state: `package.json` has no `version`; no tags; no remote; no root changelog (the spec changelog is for specs; the site's own changelog is derived from catalog dates, F-010).

Proposal:
- `package.json` `"version": "1.0.0"` (private, so it is not published to npm; it identifies the release).
- Annotated git tag `v1.0.0` on the commit that was deployed to production, created by the Owner after go-live and pushed alone (`git push origin v1.0.0`). It is not a trigger.
- A GitHub Release `v1.0.0` titled "TaroKit v1.0.0 (M-1)" with `release-notes-v1.md`.
- Scheme: MAJOR.MINOR.PATCH. 1.x is the M-1 line; fixes are `1.0.x`; a milestone batch (M-2) is `1.1.0`; a breaking change to the stored personal data (ADR-0010 schema version) or to the tool contract is `2.0.0`. Adding or changing tools and the Now note is content, not a release: it deploys by push and shows in the catalog changelog.
- Nothing in the app shows the version number (none of the specs asks for it).

## 7. Deviations from ADR-0007 and MOD-Delivery that need an OK

| Spec says | This plan | Why |
|---|---|---|
| `publish.yml` runs on push to main and deploys when green | Same (D-047), once the production secret exists; before that the deploy is skipped with a notice. A staging deploy is manual (ADR-0007 note, D-046) | Going live is controlled by when the Owner adds the production secret and the domain, after the staging checks (D-044) |
| Full three-engine e2e and Lighthouse CI gate the deploy | Chromium + WebKit required, Firefox non-blocking at first; no Lighthouse | No Lighthouse config exists; perf was measured by hand and passed; Firefox is a user manual check |
| Cloudflare token and account id "as GitHub Actions secrets" | Same, stored in GitHub environments (or repo secrets on a plan without environments) | Matches the CI brief and security-qa |
| Workers static assets, `wrangler deploy` | Same; custom domains in the dashboard; `workers_dev` off | Least privilege, no duplicate origin |
| A smoke test "no third-party requests, no Set-Cookie" | `curl`-based header checks in CI; the third-party check by hand | A real browser run needs Playwright against production; optional later |

If you approve, Claude records items in this table as an ADR-0007 note and updates MOD-Delivery (spec change, `spec_lint.py` must stay at 0 errors).

## 8. Blocking items (cannot write a passing `publish.yml` before these)

1. C-1: samples moved out of `content/` for tests (otherwise `checks` fails after replacing content, and `content-validation.test.ts:213` fails when json-formatter is unhidden).
2. wrangler added to `package.json` and the lockfile, licenses check green.
3. PIN-TODO SHAs for upload/download-artifact (or the no-artifact variant).
4. A GitHub remote and the secrets (user steps), only for the first run; the file itself can be written and linted offline (`actionlint` if you install it).
