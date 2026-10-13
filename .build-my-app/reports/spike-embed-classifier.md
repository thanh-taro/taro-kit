# Spike SP-2 — Embeddability classifier (2 h)

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-2.
- Time box: 2 h of agent work. Not built: anything outside the question. No code under src/. Code lives in `spikes/sp2/` on branch `spike/sp2`.
- Outcome: adopt / adapt / reject, recorded as a result note and spec edits.
- Note: this framing file was not present in the worktree when the spike started (only the template `spike-.md` was). It was recreated here from the brief.

## SP-2 result

**Verdict: ADAPT.** The classifier and fetcher design in MOD-CatalogCheck holds up. It agrees 100 % with Chromium and WebKit on all 10 pass-bar fixtures and on 12 extra edge cases, over both http and https, and r1–r4 give the right reasons. It is "adapt", not "adopt", for two reasons:
- **Firefox has no ground truth yet.** Firefox 142 installed (Playwright build 1495), but it was killed with SIGTERM on launch inside the agent's command sandbox, and running outside that sandbox was not permitted. One local command closes this gap: `pnpm exec playwright test --project=firefox`. Promote to "adopt" if Firefox also scores 10/10.
- **Some wording needs to change.** RULE-12, ADR-0001 and MOD-CatalogCheck need the edits listed below.

Step 4 (the GitHub Actions run against real URLs, U-5 bot protection) is **deferred**.

### Agreement (classifier vs browser, per fixture and engine)

Engines: Chromium 141.0.7390.37 and WebKit 26.0 (Playwright 1.56.1). The http and https runs gave identical results.

| Fixture | Case | Spec | Classifier | Chromium | WebKit | Firefox |
|---|---|---|---|---|---|---|
| g1 | no headers | embed | embed | embed | embed | not run |
| g2 | `frame-ancestors <portal>` | embed | embed | embed | embed | not run |
| g3 | XFO SAMEORIGIN + CSP allows portal | embed | embed | embed | embed | not run |
| g4 | 3 redirects, then unrestricted | embed | embed | embed | embed | not run |
| g5 | Report-Only `'none'` only | embed | embed | embed | embed | not run |
| b1 | XFO DENY | block | block | block | block | not run |
| b2 | XFO SAMEORIGIN | block | block | block | block | not run |
| b3 | `'self'` | block | block | block | block | not run |
| b4 | two CSPs: portal + `'none'` | block | block | block | block | not run |
| b5 | `*.portal.localhost` (apex excluded) | block | block | block | block | not run |
| x1–x12 | extras (see below) | — | 12/12 | 12/12 | 12/12 | not run |

The 12 extras:
- XFO edge cases: ALLOW-FROM; conflicting `DENY, SAMEORIGIN`; duplicate SAMEORIGIN.
- Report-Only does not override XFO.
- A policy without `frame-ancestors` does not disable XFO.
- Only the final response's headers count after a redirect, in both directions.
- A host source with no port means the default port only.
- `*`, scheme-only and `host:*` sources.
- `'none'` mixed with other sources is ignored.

**Totals:** core 10/10 on Chromium and 10/10 on WebKit; extras 12/12 on each.

### Reachability (Node 24 fetch, manual redirects)

| Fixture | Result | Attempts | Time |
|---|---|---|---|
| r1 (6 redirects) | fail, `too-many-redirects` | 1 | 12 ms |
| r2 (11 s delay) | fail, `timeout` | 2 | 20.0 s |
| r3 (404) | fail, `status-404` | 1 | 6 ms |
| r4 (500, then 200) | pass, `ok-after-retry` | 2 | 8 ms |
| r5, extra (exactly 5 redirects) | pass | 1 | 14 ms |

All results are correct.

### Evidence
- Commands, run from `spikes/sp2/`:
  - `node --test classify.test.mjs`: 30/30 pass.
  - `node run-classifier.mjs`.
  - `pnpm exec playwright test --project=chromium --project=webkit`.
  - `node compare.mjs`.
  - For https: `SP2_SCHEME=https`, plus `NODE_EXTRA_CA_CERTS=certs/cert.pem` for Node. The certificate is self-signed, generated locally and not committed.
- Output files:
  - `spikes/sp2/results/{http,https}/`: `classifier.json`, `browser-*.json` (with each engine's console refusal messages) and `portal-*.png` screenshots.
  - `results/agreement.md`.

### Surprises
- **The classifier needs `toolOrigin`.** `'self'` can't be decided from `(headers, portalOrigin)` alone. Use the origin of the final response URL; MOD-CatalogCheck's 3-argument signature is right.
- **XFO SAMEORIGIN blocks the portal even though the tool is same-site** (b2, ADR-0001). The ADR-0001 phrase "allows the portal's site" is a trap: only `frame-ancestors <portal origin>` works.
- **A duplicated or conflicting XFO blocks; it is not just a warning.** Both engines treat `DENY, SAMEORIGIN` and `SAMEORIGIN, SAMEORIGIN` as blocking, matching the HTML spec. Only unrecognised values such as ALLOW-FROM are ignored, and those warrant a warning.
- **A 10 s timeout per attempt plus one retry means about 20 s worst case per address.** This affects the CI duration budget.

### Proposed edits
- **RULE-12:**
  - Change "allows the portal's site" to "allows the portal's **origin** (scheme, host and port)".
  - Change "within 10 seconds" to "within 10 seconds per attempt".
- **ADR-0001 (line 13 and the consequences):** each own embedded tool sends `Content-Security-Policy: frame-ancestors <portal origin>`, and must not rely on `X-Frame-Options: SAMEORIGIN`.
- **MOD-CatalogCheck:**
  - Retry only on timeout, network errors and 5xx, never on 4xx.
  - Conflicting or duplicated XFO values block. Only unrecognised XFO values are warnings.
  - Spell out these matching rules: first duplicate directive wins; `'none'` counts only when it is the only source; a host source with no port means the default port; `*.` never matches the apex; http sources match https.
  - Adopt `spikes/sp2` fixtures as its unit and integration tests.
- **spikes.md SP-2 "Watch" note:** replace "invalid or duplicated XFO value is a warning" with the rule above.
- **No ADR-0009 change.**
