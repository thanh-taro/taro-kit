---
id: ADR-0006
title: Testing with Vitest, Playwright on three engines, axe, and Lighthouse CI budgets
status: proposed
date: 2026-10-13
supersedes: []
---

## Context
- Every acceptance criterion needs a test that cites its ID (CLAUDE.md; `spec_lint.py --coverage`).
- NFR-10 requires the latest two versions of Chromium, Gecko and WebKit.
- NFR-03 requires zero serious automated accessibility issues in both themes, plus a manual screen-reader pass.
- NFR-01, NFR-02 and NFR-11 are lab-measured budgets on the reference environment (`reference-environment.md`).
- Embedded-tool isolation (F-003.AC3, F-003.AC4, F-003.AC5) and shared tool storage (F-003.AC11) need a second origin to test against.
- The catalog check needs controllable header fixtures.

## Decision
- **Unit and integration: Vitest 5** (MIT), Node environment, for pure logic: search ranking, personal-data rules, backup validation and migration, content invariants, the CSP and permission derivation, and the catalog-check classifier. Tests are named with AC IDs, such as `F005_AC6 drops the hidden favorite when pinning`.
- **End-to-end: Playwright** (Apache-2.0) on the `chromium`, `firefox` and `webkit` projects, plus mobile-emulation projects (412 × 915, touch).
  - There is one spec per flow (FLOW-01, FLOW-02, FLOW-03), and per-feature specs for the remaining ACs.
  - Tests run against `astro preview` serving the real build, with the service worker on.
  - **Fixture tools** are served by a second local server on a different origin, so isolation can be tested. Same-site storage is tested with `*.localhost` host names where the engine supports them, and otherwise by the manual SP-1 matrix.
  - The catalog check is tested against a local fixture server that returns scripted headers, status codes, redirects and delays.
- **Accessibility: `@axe-core/playwright`**. It is MPL-2.0, allowed as an unmodified dev tool by ADR-0008. It runs on every screen state in both themes, and any serious or critical issue fails the run. A manual screen-reader pass on FLOW-01, FLOW-02 and FLOW-03 uses VoiceOver (macOS and iOS) and NVDA. It is recorded per release.
- **Performance:**
  - **Lighthouse CI** (Apache-2.0) runs on the mobile lab profile with custom throttling: 4× CPU, 9 Mbps down, 1.5 Mbps up, 170 ms RTT. It checks byte-weight and timing budgets for home (NFR-11, NFR-01).
  - A Playwright Chromium test with CDP 4× CPU throttling and a generated 500-entry catalog checks `performance.mark` timings for palette open and per-keystroke results (NFR-02). The median of 5 runs must pass.
  - A build-time size script sums the compressed bytes of home's initial resources as a fast pre-check.
- **Privacy checks:** an e2e test records every request on each page and fails on any non-portal origin or any `Set-Cookie` (NFR-05). The same test runs as a smoke test against production after deploy.
- **Static checks:** `astro check` with TypeScript strict, ESLint with typescript-eslint and the astro and jsx-a11y plugins, Prettier, and `python3 tools/spec_lint.py`.

## Alternatives considered
- **Jest.** Slower with ESM and Vite-based code. Vitest shares the build's config.
- **Cypress.** Weaker WebKit support and no Gecko parity in one runner. NFR-10 needs all three engines.
- **Pa11y.** LGPL-3.0, and it wraps the same axe engine. Lighthouse's accessibility audit also uses axe, so it adds nothing.
- **Visual regression from the start.** Deferred. Design-phase screenshots are reviewed by hand. Revisit after the first release.
- **WebPageTest or field monitoring.** Ruled out because NFR-05 forbids third-party beacons, and the NFR measures are lab-based.

## Consequences
- Playwright's WebKit is not Safari. Storage partitioning, install and clipboard behavior on real Safari (macOS and iOS) are verified by hand in spikes SP-1, SP-3 and SP-4, and in the release checklist.
- CI time grows with three engines. Unit tests and Chromium e2e gate every PR. The full engine matrix and Lighthouse gate publishing.
- Test names carry AC IDs, so `spec_lint.py --coverage tests/` reports any gap.
