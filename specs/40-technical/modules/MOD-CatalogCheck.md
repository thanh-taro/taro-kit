---
id: MOD-CatalogCheck
title: Catalog check
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-CatalogCheck is a Node 24 CLI (`pnpm catalog:check`) that runs in CI before every publish and weekly (ADR-0007). It loads the registry (MOD-Content) and checks addresses.

**Visible tools** (blocking):
- **Reachability (RULE-12):** a GET with manual redirect following, at most 5 hops, a 10 s timeout per attempt (covering every hop of that attempt), and one retry. The response body is cancelled after the headers arrive. A redirect to anything but `http:`/`https:` (`data:`, `file:`, `mailto:`…) fails with `unsupported-redirect`, never retried. A final URL that isn't `https:` fails with `insecure-redirect` (INV-02, F-014 edge cases); for profile links both are warnings. A crash inside the check exits 2, not 1.
- **Embeddability (embedded tools only):** read the **final** response's `X-Frame-Options` and enforced `Content-Security-Policy` headers (Report-Only is ignored), then decide whether `frame-ancestors` admits the portal origin.
  - Policies separated by commas are split, and every policy must admit the portal.
  - Source expressions are matched by scheme, host (including `*.` wildcards) and port. A path in a source expression is ignored, since ancestors are matched as origins. `'self'` means the tool's own origin, and `'none'` blocks.
  - When `frame-ancestors` is present, it overrides XFO. Otherwise `DENY` or `SAMEORIGIN` blocks (the portal is cross-origin), and invalid XFO values are reported as warnings.

**Profile links** (warnings only): reachability. Links that are not web addresses (`mailto:`) can't be fetched and are listed as skipped.

**Hidden tools** are skipped and listed as skipped (F-014.AC3). Unhiding a tool in a change makes the next check cover it.

**Output:** a pass or failure per entry, with the id, address and reason. Exit code 0 when nothing blocks (warnings allowed), 1 on any blocking failure, 2 when the check can't run (bad arguments or content that fails MOD-Content validation). A summary line gives the count of entries checked, and the same summary goes to the CI job summary. The User-Agent identifies the checker, and checks run with bounded concurrency.

## Not responsible for
- Schema and invariant validation (MOD-Content).
- Notifying the Owner. CI's failure notification does that (ADR-0007).
- Checking content inside tools.

## Public surface
- The CLI (`scripts/catalog-check.ts`, core in `src/modules/catalog-check/cli.ts`), with `--weekly` (label only), `--json` and `--portal-origin`. On GitHub Actions, failures and warnings are also printed as annotations.
- `planCheck(registry)`, `runCheck(targets, options)` and `buildReport(findings, skipped, weekly)`.
- `classifyEmbedding(headers, portalOrigin, toolOrigin) → { embeddable, reason }`, a pure function and the core under test in SP-2.

## Implements
F-014 (all requirements).

## Rules confirmed by spike SP-2
- `classifyEmbedding(headers, portalOrigin, toolOrigin)`: the tool origin is needed to resolve `'self'`.
- A CSP `frame-ancestors` overrides `X-Frame-Options`. Repeated CSP headers are split on commas, and every policy must allow the portal.
- Conflicting or repeated `X-Frame-Options` values block. Only unrecognized values produce a warning.
- Source matching: default ports are implied, a `*.` wildcard excludes the apex itself, `'none'` counts only when it is alone, and the first duplicate directive wins.
- Report-only CSP is ignored.
- Retry only after a timeout, network error or 5xx, never after a 4xx. The 10 s limit applies per attempt, so the worst case is about 20 s per address.

