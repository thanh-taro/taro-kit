# Release 1.0.0 — candidate record

## Candidate v1.0.0-rc.1

| Item           | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Tag            | `v1.0.0-rc.1` (local, annotated)                                            |
| Commit         | `8e5c40a` (`main`, pushed to github.com/thanh-taro/taro-kit)                |
| Built on       | 2026-10-20, macOS arm64, Node 24.19.0, pnpm 11.25.0, `scripts/release-build.sh` |
| Deploys        | manual only (D-052); nothing uploaded yet                                   |

### Artifacts (`release/`, gitignored)

| File                                       | sha256                                                             |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `tarokit-1.0.0-rc.1.tar.gz` (production)   | `722bf39780ad90566b25ee77d65eae4bb1adbd9c94619e26972d1e0b39ff2b6c` |
| `tarokit-1.0.0-rc.1-staging.tar.gz`        | `53af21def199b6b15fdc211d50efbcee1c56b4f0c3e2901d7fcc6e880581adf5` |

Per-file checksums: `release/tarokit-1.0.0-rc.1[-staging].dist.SHA256SUMS` (71 files, 848 KB in `dist/`).

**Reproducible:** the production build was run twice from the tag; the tarball checksum and all 71 file checksums
were identical.

### Build gates (both targets)

- size (NFR-11): home initial transfer 93.3 KB brotli of 200 KB (37 files);
- fonts: 50.6 KB of build-time subsets; service worker: 65 precache entries, 165.8 KB brotli;
- dist-clean: no tests-only pages or sample content; content validation ok.

### Verification

- Local full suite on the candidate code (2026-10-20): unit 477/477; Chromium 327 passed; WebKit 294 passed; flows 6;
  perf 4; `spec_lint` 0 errors; licenses ok.
- Firefox (Linux, `mcr.microsoft.com/playwright:v1.64.0-noble`, same as CI): 289 passed after the test-harness fixes
  below; the single remaining timeout (100-width bar sweep) passed 3/3 with `test.slow()`.
- GitHub `publish` run 39403806811 on `6caece8`: every gate green (checks, perf, catalog, WebKit, Firefox, build),
  no deploy. `8e5c40a` only changes the tag check in `scripts/release-build.sh`.

Changes since the first public push, all test harness or tooling (no site code):

- `tests/e2e/support/sites.ts`: drop the forwarded `Host` header when proxying the portal (Firefox sent
  `tarokit.test`; the preview server blocked it — 98 of 106 Firefox failures); `prefersScheme()` sets the color
  scheme on the portal origin (Firefox lost emulation across the COOP browsing-context switch); a request still in
  flight when a test ends is abandoned, not an error (WebKit CI).
- Firefox skips for three routed offline loads (`NS_ERROR_OFFLINE`), moved to the Firefox manual checks in the
  runbook (F-003.AC9, F-003.R6, F-006.R1).
- `tests/e2e/tool-view-storage.spec.ts`: Chromium-only file skip before launch.
- `scripts/release-build.sh`: accepts `vX.Y.Z-rc.N`.

### Manual checks on staging (Owner, runbook section 4)

| Check                                                            | Result |
| ---------------------------------------------------------------- | ------ |
| Screen reader (VoiceOver, NVDA): ten steps in `a11y-qa.md`       |        |
| Firefox: main screens, export/import, offline tool view           |        |
| Safari macOS + iOS: offline, clipboard, embedded storage, layout  |        |
| Real phone on 4G: first load, touch targets, install + offline    |        |
| DevTools Network: no request to another host (NFR-05)             |        |
| Link preview in a chat app (F-015)                                |        |

## Deploy log

| Date | Target | How | Version id | Smoke | Notes |
| ---- | ------ | --- | ---------- | ----- | ----- |
