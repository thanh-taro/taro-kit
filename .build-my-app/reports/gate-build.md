# Gate G4 — M-1 build (phase 4)

Date: 2026-10-19 · main at the commit after "F-007 shipped; all M-1 features shipped".

## Automated checks

| Check | Result | Evidence |
|---|---|---|
| All M-1 features `shipped` | pass | 16/16 in `specs/20-features/_index.md` |
| AC coverage | pass, 100% | `spec_lint.py --coverage tests` lists no missing AC |
| Spec lint | pass | 502 IDs, 0 errors, 0 warnings |
| Token contrast | pass | 0 failing pairs |
| Generated files current | pass | `pnpm gen:check` |
| Lint and format | pass | eslint + prettier clean |
| Type check | pass | `astro check`: 0 errors, 0 warnings |
| Licenses | pass | 747 packages, 6 registered build/dev exceptions |
| Unit tests | pass | 445/445 |
| Build | pass | dist-clean: no fixture content; fonts 50.5 KB |
| E2E (Chromium) | pass | 290 passed, 0 failed, twice with `--retries=0` |
| CI on GitHub | not run | No repository yet (created at release with the user's OK). Every CI step above was run locally with the same commands as `ci.yml`. |

## Reviews

Every feature had a code review; F-003, F-005, F-006, F-011, F-013 (and F-004) also had security/privacy audits. No open blocker, major, critical or high finding. Privacy declaration: no data collected; personal data stays in this browser and in files the user exports.

## Manual checks (not automated, carried to QA)

- F-011.AC1: installing the portal and opening it in its own window.
- Offline behavior in Safari and Firefox (Firefox won't launch in this sandbox; WebKit was run for the tool view and palette).
- F-003.AC3 and AC11 hold only in Chromium (Safari partitions storage, D-038; WebKit can't block clipboard writes).
- Re-take the F-009 screenshots; fix the compact search key cap if still overflowing.

## Release carry-overs

- The weekly catalog check fails until the four sample tools are replaced or hidden.
- json-formatter passes the catalog check; showing it is a publishing decision.
- `publish.yml` must call `catalog-check.yml` with `pre_deploy: true`.
- Real profile, bio, links and Now note from the user.
- Private GitHub repo and the Cloudflare API token secret are user steps.

## Decisions made during the build

D-040 (search keeps phrase matching, user). The user approved the link preview image. Spec clarifications (each in the changelog): RULE-05 tag match, category intro ≤ 160 characters, no asset paths outside `content/assets/`, the portal origin refused for all tools, http final addresses fail the catalog check, tools must apply repeated theme messages idempotently, ADR-0004 erratum (precache-first).
