# Spec review — F-018 privacy policy and terms of use (round 1)

Date: 2026-10-22. Scope: staged change set (F-018, SCR-Policy, ENT-Policy, glossary "Policy", COPY-footer.*, COPY-policy.updated, COPY-meta.privacy*/terms*, CMP-AppShell footer, F-015.R1, feature index, changelog) and `.build-my-app/reports/policy-drafts.md` (consistency only).
Lint: `python3 tools/spec_lint.py` → 567 IDs, 2403 references, **0 errors, 0 warnings**.
Decisions in force were not re-litigated (portal-wide pages, Vietnam law, contact email, no cookie banner, palette Pages unchanged, no staging).

## Verdicts

| Item | Verdict |
|---|---|
| F-018 | **not ready** (B1, M1–M4, m1–m3) |
| ENT-Policy (model.md) + schema | **not ready** (B1, M2) |
| SCR-Policy | ready after minor fixes (M1, M5, m4) |
| CMP-AppShell (footer, contentinfo, compact) | ready after minor fixes (M5, m4, m5) |
| Copy (COPY-footer.*, COPY-policy.updated, COPY-meta.privacy*/terms*) | ready after minor fixes (M1, m6) |
| Glossary "Policy" | ready |
| F-015.R1 pointer | ready |
| `_index.md`, changelog | ready after minor fixes (m7) |
| Technical layer (40-technical, ADR-0005, schema) | **not updated — blocks implementation** (B1) |
| policy-drafts.md (consistency) | ready after minor fixes (M2, d1–d5) |

---

## Blocker

### B1 — No technical layer and no schema for ENT-Policy; the body format is undefined
- `specs/10-domain/project.schema.json:5` and `$defs`: no `policy` definition. `specs/10-domain/model.md:74-75` names "a title, a body of headed sections and paragraphs (links allowed)" but nothing defines the authored shape, field names, required fields, limits, or how a heading or a link is written.
- `specs/40-technical/adr/ADR-0005-yaml-content-validated-by-domain-json-schema.md:17,20`: the content layout has no policy files, and the decision says "Paragraphs are separated by blank lines, and no Markdown engine is needed". Headings and inline links can't be written in that format. So F-018.R1 ("headings … as written", "links allowed") can't be built, and F-018.R5/AC5/AC6 can't be validated as written.
- Not updated: `MOD-Content.md:10,32,40-41` (load/require the two files, `Registry.privacy`/`terms`, `PUBLIC_PAGES`/`sitemapEntries` with `/privacy/`, `/terms/`); `MOD-Pages.md:11-22` (no routes, no view helper); `MOD-Meta.md:19-21` (no `metaFor({ page: 'privacy' | 'terms' })`, site index); `MOD-Shell.md:16-22,27` (no footer in the frame, no "compact has no footer"); `platform-mapping.md` (footer/contentinfo, dates as `<time>`, link targets); `architecture.md` (registry now holds policies). MOD-Offline and MOD-Search need no change: the precache already holds "every page", and the palette is unchanged.
- Consequence of R5 the technical layer must state: `loadRegistry` is used by about 30 fixture content sets in `tests/fixtures/content/*` and by MOD-CatalogCheck. Requiring both files fails all of them unless each fixture gains both files (or the loader gets an explicit option). Decide this in MOD-Content, not during the build.

**Fix (proposed):**
1. ENT-Policy (`model.md:75`), replace with:
   > One of the portal's two required documents, the **privacy policy** and the **terms of use**, written by the Owner: a **title** (up to 60 characters), a **last updated** date, and one or more **sections**, each with a **heading** (up to 80 characters) and one or more **paragraphs**. A paragraph is plain text that may hold links, each with visible text and an address (INV-02). Each policy lives in its own content file. They cover the portal and, in general terms, the tools it lists; each tool states its own data handling inside the tool.

   Also decide on lists (see M2).
2. Schema: add `$defs/policy` (`title`, `updated` → `#/$defs/date`, `sections` array `minItems: 1` of `{ heading, body }`, `unevaluatedProperties: false`, `$comment: "ENT-Policy (F-018): content/privacy.yaml and content/terms.yaml, both required."`). Update the schema `description` (line 5) to list ENT-Resume and ENT-Policy.
3. ADR-0005: add an amendment note: `content/privacy.yaml` and `content/terms.yaml` are **required** (editor hint `content/schemas/policy.json`). Each section's `body` is a block scalar whose paragraphs are separated by blank lines. Pick one link syntax and write it down. Example: `[text](https://…)` and `[text](mailto:…)` parsed by a small in-house function (so the "no Markdown engine" decision holds), with any other bracket syntax or address left as literal text. Errors name the section as `section <n>`: `content/privacy.yaml:14 › section 2 › INV-02: link "http://x" is not https`. A missing file reports `content/terms.yaml › - › SCHEMA: file is missing`, the existing contract at `registry.ts:127`. If a Markdown library is chosen instead, register it in `dependencies.md` per ADR-0008 first.
4. MOD-Content, MOD-Pages (`/privacy/`, `/terms/` → SCR-Policy, static, no island), MOD-Meta, MOD-Shell (footer in `full` only), platform-mapping: add the lines listed above. State what happens to the fixture sets.

---

## Major

### M1 — The AC1 date format is new and defined nowhere; it contradicts the existing date display
- `F-018-privacy-and-terms.md:32` expects the visible text "Last updated 22 October 2026" (day first). The Now note, the only other dated document, shows `Oct 22, 2026` and reads `October 22, 2026` in full (en-US, `src/modules/pages/now/now.ts` `dateText`). `SCR-Policy.md:31` and `F-018.md:41` say "read in full", the same phrase SCR-Now uses for short-visible plus full-accessible. Nothing says which format is visible. An implementer reusing `dateText` fails AC1; one following AC1 creates a second, inconsistent date format.
- **Fix:** state the format once, in SCR-Policy layout region 2: "Title and last updated date (COPY-policy.updated), the date shown in full as the English month, day and year ("October 22, 2026"), the same full format the Now note's date is read with." Change AC1 to: "…and "Last updated October 22, 2026" are shown, the date marked up as 2026-10-22." If the Owner prefers day-first, it must become a rule (and the Now note decision revisited), not a one-off.

### M2 — Links and lists: allowed schemes, tab behavior and the draft's bullet list are unspecified
- `model.md:75` "links allowed": INV-02 (`model.md:93`) covers only tool addresses and profile links. Nothing stops `http:` or `javascript:` links in a policy, and no rule says whether web links open in a new tab. Profile links do (MOD-Content `profileLinks`); `SCR-Policy.md:28` only says "Exits to: links inside the policy text".
- The draft (`policy-drafts.md:24-26`) uses a bulleted list, which ENT-Policy ("headed sections and paragraphs") does not allow. Either the build rejects or flattens it, or the format grows.
- **Fix:** INV-02 → "Every tool address, profile link and link in a policy uses a secure web address (https), except email links." SCR-Policy Entry & exit → "Exits to: any shell destination; links inside the policy text (web links open in a new tab, like profile links; email links open the mail app)." Decide on lists: either add "and simple bulleted lists" to ENT-Policy and the schema, or rewrite draft lines 23-26 as one sentence ("…on this device only: the tools you pin as favorites and the ones you opened recently, your theme choice (light, dark or system), and the days you opened TaroKit."). Add AC8: "Given a privacy policy paragraph with a link to https://www.cloudflare.com/privacypolicy/ and one to mailto:adamnguyen.itdn@gmail.com, when the Privacy page opens, then both are links with that text and address, and the web link opens in a new tab. (R1)" Add AC9: "Given a policy link to http://example.com, when the content is validated, then the build fails, naming the file, the section and INV-02. (R5)"

### M3 — AC5/AC6 name things that don't exist ("the terms file", "the date rule")
- `F-018.md:36-37`: no file name is specified anywhere, and there is no "date rule". The validator reports a bad date as `SCHEMA: updated <v> is not a valid date` (`src/modules/content/schema.ts:148`). R5 ("the rule it breaks") has `rules: []`.
- **Fix:** AC5 → "Given content without `content/terms.yaml`, when the portal is built, then the build fails and the error names `content/terms.yaml` as missing. (R5)" AC6 → "Given a privacy policy whose `updated` is `2026-13-01`, when the content is validated, then the build fails and the error names `content/privacy.yaml`, the `updated` field and the value. (R5)" (Both paths come from the ADR-0005 amendment in B1.) Add one AC for an empty policy, e.g. "Given a terms of use with no sections, … the build fails naming `content/terms.yaml` and the missing sections. (R5)".

### M4 — No AC for the footer's current-page marking or the heading structure
- SCR-Policy (`:16`, `:31`) requires the footer link of the page shown to be marked current, plus one page heading with section headings one level below. F-018.R1 and Edge cases (`:45`) rely on "real headings". None of this is tested, and it is the only screen-reader navigation the page has (NFR-03).
- **Fix:** extend AC1: "…then the title is the only level-1 heading, both section headings are level-2 headings, … " and add to AC3: "On the Privacy page the footer's Privacy link is marked as the current page, and on the Terms page the Terms link."

### M5 — No design boards for SCR-Policy or the shell footer
- `adapters/design.md:6-9` needs one artboard per screen state and viewport (desktop 1440, mobile 390), and a component artboard covering every Variants & states row. `design/canvas/` has no Policy board, and neither `CMP-AppShell.dc.html` nor any screen board has a footer. Without them, the footer's placement on every page (home, narrow, offline/update states) and the reading-width layout are left to the implementer.
- **Fix:** before `ready`, add `PolicyDesktop` and `PolicyMobile` (SCR-Policy / default, both themes) and add the footer to `CMP-AppShell.dc.html` (full and narrow; compact shown without it). Add to the changelog entry: "Design: PolicyDesktop, PolicyMobile; CMP-AppShell footer."

---

## Minor

- **m1** `F-018.md:34` AC3, "the tool view" has embedded, linked, offline and loading states, and `/t/<hidden>/` serves the not-found page (with a footer). → "Given the tool view of an embedded tool and of a linked tool, when each opens, then it shows neither link. Given a hidden tool's address, when it opens, then the not-found page links to Privacy and Terms."
- **m2** `F-018.md:33` AC2 is not concrete. → "Given terms of use titled "Terms" with three sections and the last updated date 2026-10-22, when the Terms page opens, then the title, the three headings, their paragraphs and "Last updated October 22, 2026" are shown. (R2)"
- **m3** `F-018.md:12` `nfr:` omits NFR-12 (AC4 relies on the length limits) and NFR-07/NFR-09 (the footer on narrow screens and as touch targets). → `nfr: [NFR-03, NFR-05, NFR-06, NFR-07, NFR-09, NFR-12]`.
- **m4** `CMP-AppShell.md:24` Behavior says "The current page is marked in navigation" only. The footer's marking lives in SCR-Policy (`:16`, `:31`), so the fact is in two places and missing from the component. → "The current page is marked in navigation and, for the Privacy and Terms pages, in the footer." Drop the duplicate from SCR-Policy region 4 (keep "Shell footer").
- **m5** `MOD-Pages.md:43` says what's new "as the last region, its appearing moves nothing". With a footer below it, the footer jumps when the island hydrates. → When updating MOD-Pages/MOD-Shell (B1), state that what's new reserves its space before hydration, or that the footer is placed so a late region does not move it.
- **m6** Copy voice (PRN-04, `copy.md:5`): the sibling descriptions are first person ("Who I am…", "Every tool I've built…"). `copy.md:161` and `:163` aren't, and "what never leaves it" overstates (request data reaches the host, COPY-settings.privacyHosting). → COPY-meta.privacyDescription: "How I handle your data: what stays on your device, and what reaches my host." COPY-meta.termsDescription: "The ground rules for using TaroKit and the tools I build." (both well under 160).
- **m7** `specs/60-delivery/roadmap.md:9` M-1 still lists "F-001 to F-016" while F-018 is `milestone: M-1` (F-017 has the same gap). → "…F-001 to F-018, except the deprecated projects showcase (D-055)", plus "privacy policy and terms" in the M-1 summary. Changelog `:97`: record that shipped F-015 (R1) and CMP-AppShell change behavior, as D-055's entry does.

## Policy draft consistency (`.build-my-app/reports/policy-drafts.md`)
- **d1** `:26` "the dates you opened TaroKit, for the last 60 days, so the home page can show how often you use it". RULE-13 keeps the latest **60 dates** (not days), and days used shows in **Settings** (F-006.R6), not on home. → "the last 60 days on which you opened TaroKit, so Settings can show how often you use it."
- **d2** `copy.md:138` COPY-settings.privacyTools says each tool has "its own privacy policy". F-018 Scope (`:22`), ENT-Policy and draft `:33` say each tool states its handling inside the tool. → COPY-settings.privacyTools: "Each tool is its own site and tells you how it handles your data. The only thing I tell a tool inside TaroKit is which theme you're using." Consider adding a link from SCR-Settings region 4 to the Privacy page, so the full statement lives in one place.
- **d3** `:17` and `:52` put "Last updated 22 October 2026" in the body. The date comes from the `updated` field (R1, COPY-policy.updated), so authoring it in the body duplicates it. Remove it from the content files.
- **d4** `:40` "TaroKit and its tools are served by Cloudflare". External tools (linked, RULE-07) aren't. → "TaroKit and the tools I build are served by Cloudflare."
- **d5** `:58` "The tools never change your original files; anything they save is a new file" and `:33`/`:61` "processed on your device and never uploaded": nothing in the specs backs these, since tools are separate projects (tool-contract.md doesn't require it). Either add the promise to `specs/40-technical/tool-contract.md` or soften it to "The tools I build are designed to…". Otherwise checked and consistent: NFR-05/INV-05 (theme only), RULE-10 isolation, F-013 export/import/erase, F-011 offline copy, COPY-settings.privacyHosting (no analytics), the PolyForm Noncommercial 1.0.0 licence (D-051, `LICENSE.md`).

---

## Triage (orchestrator, 2026-10-22)
- **B1** fixed: ENT-Policy wording (with simple bulleted lists), `$defs/policy` (title ≤60, updated, 1–20 sections of heading ≤80 and body ≤4000, closed), schema description, ADR-0005 note from F-018 (required files, body format, `[text](address)` links parsed in-house, `section <n>` errors, every content set including fixtures has both files), MOD-Content (`privacy`, `terms`, `policy.ts`, sitemap entries), MOD-Pages (routes, `policyView`, `PolicyView.astro`), MOD-Meta, MOD-Shell (footer in full only), platform mapping (routes, footer, `<time>`). architecture.md unchanged: its registry wording is generic ("the Owner's content").
- **M1** fixed: full date "October 22, 2026" defined in SCR-Policy region 2; AC1/AC2 updated.
- **M2** fixed: INV-02 covers policy links; SCR-Policy exit rule for new tabs; lists allowed (ENT-Policy, ADR note); AC8, AC9 added.
- **M3** fixed: AC5/AC6 rewritten with file paths and field; AC10 added (no sections).
- **M4** fixed: AC1 heading levels; R3 and AC3 current-page marking.
- **M5** deferred to the build step on purpose: the Owner's plan makes the design boards (PolicyDesktop, PolicyMobile, CMP-AppShell footer) part of building F-018, before any code; the changelog lists them.
- **m1–m4, m6, m7** fixed as proposed. **m5** fixed: MOD-Pages states the footer moves below what's new but is not in view on first load; CMP-AppShell states the footer sits after the content.
- **d1–d5** fixed in policy-drafts.md (d5 softened to "the tools I build"); d2 also changes COPY-settings.privacyTools (shipped copy, noted in the changelog). Hosting paragraph corrected after the Cloudflare audit: the always-on dashboard traffic totals and the security events log are disclosed.
