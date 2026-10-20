# Spec review: F-017 résumé change request (2026-10-20)

Lint: `541 IDs, 2249 references, 0 errors, 0 warnings`.

## Verdicts
| Item | Verdict |
|---|---|
| F-017 | not ready |
| SCR-Resume | ready after minor fixes |
| ENT-Resume, INV-08 | not ready |
| RULE-15 | ready after minor fixes |
| `$defs.resume`, `$defs.yearMonth` | ready after minor fixes (not wired yet, see B1) |
| Glossary "Résumé" | ready |
| COPY-resume.*, COPY-nav.resume, COPY-about.resume, COPY-meta.resume* | ready (PRN-04 voice fine; meta lengths 16/55 chars, within NFR-12) |
| CMP-AppShell, SCR-About, _index, changelog | ready after minor fixes |

## Blocker
**B1. The content file is not named or wired anywhere.** `specs/10-domain/model.md:61-69`, `specs/40-technical/modules/MOD-Content.md:10,33,53`, `specs/40-technical/adr/ADR-0005-...md:17`. No spec says which file holds the résumé or that it is optional. MOD-Content loads `content/**/*.yaml` and names only `now.yaml` as optional. The `Registry` has no `resume`, and "Implements" leaves out F-017.R5. The accepted ADR-0005 layout lists only categories, profile and now.
Fix:
- MOD-Content:10: add "`resume.yaml` is optional: without it there is no résumé and `resume` is undefined (F-017.R4). It is checked against `$defs/resume`."
- :33: add `resume` to Registry.
- :53: add "F-017.R5" and "supplies data behind F-017".
- ADR-0005: add a dated note: "`content/resume.yaml` (optional, F-017), with editor hint `content/schemas/resume.json`; second pass adds INV-08."
- Builder must add: `content/schemas/resume.json` (`$ref …#/$defs/resume`), a `resume` member in the `Def` union, and the `yaml-language-server` header.

## Major
**M1. INV-08's build-date clause conflicts with rules.md and has no AC.** `model.md:96`, `rules.md:8` ("never from the date the portal was built"). Nothing tests a future start, and the clock and time zone are unspecified.
Fix:
- INV-08: "…and no start month is later than the month of the build date (UTC). This is the one check measured from the build date; it catches typos."
- rules.md:8: append "(display only; INV-08 is a build check)".
- Add F-017 AC11: "Given the build date 2026-10-20 and an experience starting 2026-11, when the content is validated, then the build fails naming resume.yaml, experience #1 and INV-08; starting 2026-10 passes."
- MOD-Content: `loadRegistry({ today })` so tests can inject the date.
Open question for the Owner: is a future *end* month allowed (expected graduation)? State it either way.

**M2. The error format drops the rule and leaves the position base undefined.** `F-017.md:29,40,41` against F-001.R2 / ADR-0005 (`file:line › entry › rule: message`).
Fix R5: "…naming the file, the entry as `<section> #<n>` (counting from 1) and the broken rule (schema or INV-08)". AC9: "…names `content/resume.yaml`, `experience #2` and INV-08". AC10: "…names `education #1` and the unknown field".

**M3. Empty résumé is undefined.** Schema `required: []` and no `minItems` (`project.schema.json:450-647`), and `model.md:69`. A `resume.yaml` of `{}` or all-empty lists would publish a page with only a heading.
Fix model.md:69: "A résumé with no entries in any section counts as no résumé (no page, no links)." Add the matching AC8 variant. Alternatively set `"minProperties": 1` on resume and `"minItems": 1` on each list.

**M4. The Pages list and the link preview live in other features but aren't amended.**
- `F-004-command-palette.md:26` (R2) still enumerates Pages without Résumé. Fix: "Home, Tools, Projects, About, Résumé (when there is one, F-017), Now and Settings".
- `F-015-link-previews.md:26` (R1) doesn't list COPY-meta.resume*. R3's "public pages" (static `PUBLIC_PAGES`) must include the page only when there is a résumé. F-017.md:44 mentions previews only in UX notes, with no R or AC. Add F-017 R6: "When there is a résumé, the page declares COPY-meta.resumeTitle and COPY-meta.resumeDescription with the shared image and is in the site index." Add AC12 for it, and extend AC8 with "…and the site index doesn't list it".
- MOD-Pages route table (`MOD-Pages.md:19-20`) and MOD-Meta need a `/resume/` route. No spec gives the address. Fix: add `| /resume/ | SCR-Resume | Static, no island; built only when there is a résumé. |`.
- `_index.md:29`: F-017 depends on F-004 and F-015 too.

**M5. Month format conflicts with existing date formatting.** `F-017.md:49`, `rules.md:26` against `MOD-Copy.md:9,17` (`formatMonth` uses `Intl.DateTimeFormat(undefined…)`, device locale). In code, Now and changelog dates use hard-coded en-US: "Oct 20, 2026" and month groups "October 2026". "like the rest of the portal" is therefore false per the specs, and the changelog uses *long* months. Fix RULE-15: "…as the abbreviated English month and the year (`Jun 2022`), formatted at build". Fix MOD-Copy:17: "build-time absolute dates (Now, changelog, résumé) use English; only the home clock uses the device locale". Either accept short vs long months or align them.

## Minor
- `F-017.md:37` AC6 is not concrete. Use: "language Vietnamese / Native, certificate 'AWS SAA' / Amazon / 2023, award 'Top Mentor' / Rising Stars / 2024 → each name or title is shown with 'Native', 'Amazon' and 2023, 'Rising Stars' and 2024." Also, no spec sets the issuer/year layout.
- `SCR-Resume.md:33` "At 390 px" is a pixel value in the neutral layer (README:99). Use "On narrow layouts the skills grid becomes two columns…". "read in full" can't be tested: add COPY-resume.periodSpoken `{start} to {end}` with full month names, or drop it.
- `rules.md:26` "given in words" vs "5 out of 5". Use "also given as text (COPY-resume.skillLevel)".
- No AC for education without an end ("present" per RULE-15). Confirm this is intended.
- `SCR-About.md:29` Exits: add "SCR-Resume (when there is a résumé)".
- `project.schema.json:5` description: add ENT-Resume.
- `F-001-maintain-catalog.md:21` Scope In: add "the résumé (F-017)". `architecture.md:51`: "…profile, Now or résumé file".
- F-011: no change needed, since MOD-Offline precaches every page (`MOD-Offline.md:13`). An optional offline AC for the page would help.
