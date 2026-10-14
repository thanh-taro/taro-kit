# Gate G3: Architecture

| Check | Result | Evidence |
|---|---|---|
| Empty app shell builds and runs | pass | `pnpm gen && pnpm build`; home renders (screenshots); Chromium e2e 6/6 (skip link first, no CSP violations, no third-party requests) |
| CI green | pass (locally) | every step of .github/workflows/ci.yml passes locally: gen:check, lint, astro check, licenses:check, vitest 33/33, build, fonts:check, Playwright Chromium, spec_lint 0/0, token_contrast 0. There is no GitHub repo yet (release decision) |
| All spikes closed with ADRs | pass | SP-1 to SP-6 closed; results amended into ADR-0001 to ADR-0010; ADR-0001 and ADR-0011 accepted |
| Every dependency approved | pending your approval | license audit 1: nothing rejected; build-only copyleft allowed (D-023); DEP-41 to DEP-44 added by the scaffold |

## Stack (to accept)
Astro 7 static + Preact islands (ADR-0002) · plain CSS with generated tokens and build-time font subsets (ADR-0003) · Workbox injectManifest with parallel precache (ADR-0004) · YAML content + Ajv on the domain schema (ADR-0005) · Vitest, Playwright, axe, perf gates on the Playwright rig (ADR-0006) · Cloudflare Workers static assets via GitHub Actions (ADR-0007) · scope-based license policy (ADR-0008) · sandboxed iframes with per-page CSP and Permissions-Policy (ADR-0009) · one localStorage document (ADR-0010).

## Money and legal
- Domain tarokit.app: bought (D-025). Cloudflare Free plan: $0. GitHub private repo: free tier, to be created at release (D-022).
- No paid services. Fonts are OFL and icons ISC/MIT; notices are generated.

## Measured
Home: HTML 4.2 KB, JS 10.5 KB, CSS 2.6 KB, fonts about 31 KB used (50.6 KB subset total), all gzip. Palette at 500 entries: open about 20 ms, keystroke under 30 ms at p95 (SP-6).

## Known limits (accepted)
- Safari keeps separate storage for embedded tools (D-038).
- Some browsers cannot restrict clipboard writes or file inputs (RULE-10).
- Firefox cannot be automated in this sandbox; CI runs Chromium (and WebKit) e2e.
