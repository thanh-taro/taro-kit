# Gate G5: QA and hardening (phase 5)

Date: 2026-10-20 · main at "Merge QA phase 5 fixes".

## Audits

| Audit | Report | Blockers | Result |
|---|---|---|---|
| Flows, visual, traceability | `traceability.md`, `shots/` | 0 | FLOW-01/02/03 pass in Chromium and WebKit; no product bugs found |
| Accessibility | `a11y-qa.md` | 0 | 2 major and 9 minor; all fixed except m5 (copy, needs the user) |
| Security and privacy | `security-qa.md` | 0 | 1 low (privacy copy, needs the user), 5 informational; I-1 HSTS and I-4 persist-credentials fixed |
| Performance and NFRs | `perf-qa.md` | 0 | every measured NFR passes; palette readiness and the slow keystroke improved |
| Licenses | `license-audit-2.md` | 0 | approved for release; DEP-17 wording fixed |

## Automated checks after the fixes

| Check | Result |
|---|---|
| gen:check, lint, format, `astro check` | pass, 0 errors |
| Unit tests | 449/449 |
| Build | dist-clean ok, fonts 50.5 KB |
| E2E Chromium | 309 passed, 0 failed (`--retries=0`) |
| E2E WebKit | 278 passed in two of three runs; one run had 1 failure that didn't reproduce (WebKit load flake, test name not captured) |
| Spec lint and AC coverage | 502 IDs, 0 errors; 129/129 ACs have tests |
| Token contrast | 0 failing pairs |

## Performance (mobile profile, 4× CPU, 9 Mbps, 170 ms RTT)

| NFR | Measured | Target |
|---|---|---|
| NFR-01 first view, cold | 0.45–0.62 s | 1.5 s |
| NFR-01 warm | 0.05–0.07 s | 0.5 s |
| NFR-02 keystroke p95 | 23–39 ms; max 16 ms after the fix | 50 ms |
| NFR-11 home weight | ~96 KB brotli | 200 KB |
| CLS | 0 (mobile), ≤ 0.0008 (desktop) | |

## Decisions (answered by the user at the gate: D-041 to D-044)

G5 approved on 2026-10-20. The fuller privacy text and the toolbar name are applied; the narrow header is confirmed; the manual checks move to the release checklist (staging, before going live). After the copy changes: Chromium 310/310, WebKit 279/279.


1. **Privacy text in Settings (COPY-settings.privacy, security L-1).**
   - Current: "No accounts, no tracking. Everything you do here stays in your browser, and I never see it."
   - The current text omits three things:
     - embedded tools are told the theme;
     - each tool is its own site;
     - Cloudflare processes request data to serve the site.
   - Proposed text, in the first person (PRN-04): see the chat summary.
2. **Toolbar name (a11y m5).** Add COPY-tool.toolbarLabel = "{tool} controls"; the frame keeps "{tool} tool".
3. **Narrow header below 360 px (a11y M1, CMP-AppShell).** The bar shows only the logo mark; the name stays its accessible name. This is a visible design change, approved by Claude so the bar fits from 320 px. The user confirms or asks for another treatment (screenshot `shots/qa5-fixes/M1-home-320-header.png`).

## Manual checks (for the user)

- Screen reader (VoiceOver, NVDA): the 10 steps in `a11y-qa.md`, "Manual checks for a real screen reader".
- Real devices: the steps in `perf-qa.md`, "Manual checklist":
  - a phone on 4G;
  - installing the app and using it offline (F-011.AC1);
  - touch targets.
- Browsers: Firefox (all flows); Safari:
  - offline;
  - clipboard restriction (F-003.AC3);
  - embedded storage (F-003.AC11, D-038);
  - CLS.
- A link preview as shown by a real chat or social service (F-015).

## Carried to release (phase 6)

- **Commit history.** 101 of 149 commits use a work email address. Decide whether to rewrite them before the first push.
- **Spike branch `spike/sp1-sp3`.** Never push it: it holds the Cloudflare account id and committed `node_modules`.
- **Sample content.**
  - Replace or hide the sample tools and the `example.com` profile link, and check that no DNS records are left for `sample-*`.
  - Add the real bio, links and Now note.
  - The json-formatter unhide decision.
- **Deployment.** `publish.yml` calls `catalog-check.yml` with `pre_deploy: true`.
- **User steps.** The private GitHub repo and the Cloudflare API token secret.
- **Optional.** A footer or About link to `/third-party-notices.txt` (license minor 1).
- **Roadmap M-2.** One shared tool page in the precache, before the catalog grows large.
