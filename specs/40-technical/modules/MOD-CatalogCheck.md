---
id: MOD-CatalogCheck
title: Catalog check
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-CatalogCheck is a Node 24 CLI (`pnpm catalog:check`) that runs in CI before every publish and weekly (ADR-0007). It loads the registry (MOD-Content) and checks addresses.

**Visible tools** (blocking):
- **Reachability (RULE-12):** a GET with manual redirect following, at most 5 hops, a 10 s total timeout, and one retry. The response body is cancelled after the headers arrive.
- **Embeddability (embedded tools only):** read the **final** response's `X-Frame-Options` and enforced `Content-Security-Policy` headers (Report-Only is ignored), then decide whether `frame-ancestors` admits the portal origin.
  - Policies separated by commas are split, and every policy must admit the portal.
  - Source expressions are matched by scheme, host (including `*.` wildcards) and port. `'self'` means the tool's own origin, and `'none'` blocks.
  - When `frame-ancestors` is present, it overrides XFO. Otherwise `DENY` or `SAMEORIGIN` blocks (the portal is cross-origin), and invalid XFO values are reported as warnings.

**Project and profile links** (warnings only): reachability.

**Output:** a pass or failure per entry, with the id, address and reason. Exit code 1 on any blocking failure. A summary line gives the count of entries checked, and the same summary goes to the CI job summary. The User-Agent identifies the checker, and checks run with bounded concurrency.

## Not responsible for
- Schema and invariant validation (MOD-Content).
- Notifying the Owner. CI's failure notification does that (ADR-0007).
- Checking content inside tools.

## Public surface
- The CLI, with `--weekly` (label only), `--json` and `--portal-origin`.
- `classifyEmbedding(headers, portalOrigin, toolOrigin) → { embeddable, reason }`, a pure function and the core under test in SP-2.

## Implements
F-014 (all requirements).
