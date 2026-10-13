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
- `build`: content validation, then `astro build`, then the SW build, then headers, then notices;
- `test`, `e2e`, `a11y`, `perf` and `check`.

**GitHub Actions workflows (ADR-0007):**
- `ci.yml` for pull requests;
- `publish.yml` on `main`, where the catalog check gates `wrangler deploy`, followed by a production smoke test (no third-party requests, no cookies);
- `weekly-check.yml`.

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
