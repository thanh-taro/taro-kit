# TaroKit environments (v1.0.0)

Companion to [runbook.md](runbook.md). Names only: this file never holds a secret value, and neither does any file in
the repo. Decisions: D-046 (staging), D-051 (public repo, PolyForm Noncommercial), D-052 (manual deploys only).

| Environment | Where it runs                 | Worker (`wrangler.jsonc`)           | Build command            | Shipped by                                     |
| ----------- | ----------------------------- | ----------------------------------- | ------------------------ | ---------------------------------------------- |
| local       | `astro dev` / `astro preview` | none                                | `pnpm dev`, `pnpm build` | never                                          |
| staging     | https://staging.tarokit.app   | `tarokit-staging` (`--env staging`) | `pnpm build:staging`     | by hand only (workflow run, or local wrangler) |
| production  | https://tarokit.app           | `tarokit` (top level)               | `pnpm build`             | by hand only (workflow run, or local wrangler) |

A push to `main` runs the gates and the production build and never ships anything (D-052). Staging is temporary: it
is removed after launch (runbook "Teardown of staging").

## 1. Build-time variables

All are read from the shell environment of the build. They are not runtime variables: the output is static files, and
no environment variable reaches a visitor's browser. Nothing is read from `.env` automatically (see `.env.example`).

| Variable                            | Read by                           | Local                                   | Staging                       | Production                    | Notes                                                                                                                                                    |
| ----------------------------------- | --------------------------------- | --------------------------------------- | ----------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TAROKIT_PORTAL_ORIGIN`             | `src/modules/content/registry.ts` | blank (means `https://tarokit.app`)     | `https://staging.tarokit.app` | blank (`https://tarokit.app`) | Canonical URLs, `og:url`, `og:image`, sitemap, robots. `pnpm build` clears it; `pnpm build:staging` sets it. Never set it by hand.                       |
| `TAROKIT_CONTENT_DIR`               | registry, `astro.config.ts`       | blank (`./content`)                     | blank                         | blank                         | Points the build at another content folder; tests and `build:samples` only. **Never set in release builds** (both scripts clear it).                     |
| `TAROKIT_FIXTURES`                  | `astro.config.ts`                 | `1` only inside `pnpm build:fixtures`   | blank                         | blank                         | Builds tests-only pages into `dist-fixtures/`. **Test-only: never set in release builds** (`check-dist-clean.ts` fails the build if they reach `dist/`). |
| `TAROKIT_SAMPLES`                   | `astro.config.ts`                 | `1` only inside `pnpm build:samples`    | blank                         | blank                         | Builds the e2e sample site into `dist-samples/`. **Test-only: never set in release builds.**                                                             |
| `TK_E2E_PORT`                       | `tests/e2e/ports.ts`, specs       | optional, default `4321`                | n/a                           | n/a                           | **Test-only.** Change when another worktree holds the port.                                                                                              |
| `TK_E2E_FIXTURES_PORT`              | `tests/e2e/ports.ts`              | optional, default `4322`                | n/a                           | n/a                           | **Test-only.**                                                                                                                                           |
| `TK_PERF`                           | `playwright.config.ts`            | set by `pnpm perf`                      | n/a                           | n/a                           | **Test-only.** Set by the config itself; do not export it.                                                                                               |
| `PYTHON`                            | `scripts/gen.ts`                  | optional (default `./.venv`, `python3`) | same                          | same                          | Which Python subsets fonts. `scripts/release-build.sh` uses `./.venv`.                                                                                   |
| `ASTRO_TELEMETRY_DISABLED`          | Astro                             | `1` recommended                         | `1` (set by the workflow)     | `1` (set by the workflow)     | Keeps Astro telemetry off.                                                                                                                               |
| `WRANGLER_SEND_METRICS`             | wrangler                          | `false` recommended                     | `false` (set by the workflow) | `false` (set by the workflow) | Keeps wrangler telemetry off. For a local run, export it yourself.                                                                                       |
| `SMOKE_BASE`                        | `scripts/smoke-test.sh`           | optional                                | n/a                           | n/a                           | **Test-only.** Fetches from a local server while checks still expect the host. Never set when smoking a real site.                                       |
| `CI`                                | Playwright, `release-build.sh`    | set by `release-build.sh`               | set by GitHub                 | set by GitHub                 | Standard flag; only test retries and server reuse depend on it.                                                                                          |
| `SOURCE_DATE_EPOCH`, `TZ`, `LC_ALL` | `release-build.sh`                | set by the script                       | same                          | same                          | Reproducibility only (see the script header).                                                                                                            |

Release builds set exactly one TaroKit variable, and only for staging: `TAROKIT_PORTAL_ORIGIN` (inside
`pnpm build:staging`). Every other `TAROKIT_*` variable is cleared by the scripts.

## 2. Secrets (names only)

| Secret                  | Purpose                                     | Where it lives                                                          | Minimum permission                                    |
| ----------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Lets a manual publish run upload a build    | GitHub environments `staging` and `production` of `thanh-taro/taro-kit` | Account → Workers Scripts → Edit, on one account only |
| `CLOUDFLARE_ACCOUNT_ID` | Which Cloudflare account the upload goes to | Same two GitHub environments                                            | n/a                                                   |

A local deploy needs neither: the Owner runs `npx wrangler login` (browser OAuth) and wrangler keeps its own
credentials in the user profile, outside the repo. The token never needs Zone or DNS permission, because the custom
domains are attached once in the dashboard (section 4). Only the Deploy steps of `publish.yml` read the secrets.

## 3. External services and accounts

| Service    | Account                                            | Used for                                                           |
| ---------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| GitHub     | `thanh-taro` (repo `taro-kit`, public)             | Source and CI: `ci.yml`, `publish.yml`, weekly `catalog-check.yml` |
| Cloudflare | The Owner's account holding the `tarokit.app` zone | Hosting both Workers, DNS, TLS                                     |

No analytics, error tracking or other third-party service is used (NFR-05, D-037). Cloudflare Web Analytics and the
RUM beacon stay off for the zone.

## 4. Domains, DNS and custom domains

| Hostname              | Serves                   | Record                                                                                |
| --------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| `tarokit.app`         | Worker `tarokit`         | Custom domain on the Worker; Cloudflare creates the DNS record and certificate itself |
| `staging.tarokit.app` | Worker `tarokit-staging` | Custom domain on that Worker; removed at staging teardown                             |
| `<tool>.tarokit.app`  | Each tool's own project  | Owned by each tool's project, not by this repo (INV-03)                               |

`.app` is on the HSTS preload list, so browsers always use HTTPS. `workers.dev` and preview URLs are off in
`wrangler.jsonc` (ADR-0007). A custom domain can't be attached while a DNS record with the same name exists; the
dashboard says so, and the old record must be removed first.

## 5. Local setup

See `README.md` and `CLAUDE.md` "Local setup": Node 24, pnpm 11, Python 3 with `requirements-build.txt` in `.venv`.
`scripts/release-build.sh` builds a release candidate from a tag into `release/` (gitignored) and contacts nothing.
