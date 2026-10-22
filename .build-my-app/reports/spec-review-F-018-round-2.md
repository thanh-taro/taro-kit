# Spec review — F-018 privacy policy and terms of use (round 2)

Date: 2026-10-22. Scope: the round-1 fixes (staged plus unstaged `git diff`) and the items they reference. M5 (design boards) is deferred to the build step by decision and not re-raised.
Lint: `python3 tools/spec_lint.py` → 570 IDs, 2472 references, **0 errors, 0 warnings**.

## Verdicts

| Item | Verdict |
|---|---|
| F-018 | **ready** (after the draft fix below, which is content, not spec) |
| ENT-Policy, INV-02 (model.md) | ready |
| `$defs/policy` (project.schema.json) | ready |
| SCR-Policy | ready |
| CMP-AppShell (Behavior) | ready after minor fixes (n1) |
| Copy (COPY-meta.privacy/termsDescription, COPY-settings.privacyTools) | ready |
| ADR-0005 "Note from F-018" | ready after minor fixes (n2; R2-M1 option b) |
| MOD-Content, MOD-Pages, MOD-Meta, MOD-Shell, platform-mapping | ready (n1 applies to MOD-Pages) |
| Roadmap, changelog | ready |
| policy-drafts.md (consistency) | **needs a fix before it becomes content** (R2-M1) |

All round-1 findings are resolved as triaged (B1, M1–M4, m1–m4, m6, m7, d1–d5). m5 is only partly resolved; see n1.

## Checked and consistent (no action)
- **INV-02 extension:** F-001.R2 already fails the build on INV-02, so policy links are covered. The schema's `link` and `secureUrl` comments still describe their own scopes correctly. MOD-CatalogCheck checks reachability, not INV-02 authoring, so policy links stay unchecked for reachability. This is consistent: F-018 doesn't ask for that check.
- **Error contract:**
  - AC5 matches the existing `file is missing` error (`src/modules/content/registry.ts:127`).
  - AC6 matches `SCHEMA: updated <value> is not a valid date` (`schema.ts:148`).
  - AC9 matches the ADR's `section <n> › INV-02` form.
  - AC10 matches Ajv's missing-required error. `sections: []` fails `minItems` too.
- **Palette unchanged:** `PUBLIC_PAGES` (`src/modules/content/derive.ts:39`) feeds only `sitemapEntries`, not the palette. MOD-Search and MOD-Palette are unaffected, as decided.
- **Sitemap:** MOD-Content and MOD-Meta agree: `/privacy/` and `/terms/` come last among the public pages. They are not `noindex`, which matches F-018.AC4. The existing exact-list sitemap test in `tests/unit/meta.test.ts` will need updating. That is expected work, not a spec problem.
- **NFR-12:** "Privacy — TaroKit" and "Terms — TaroKit" are 17 and 15 characters (limit 60). The descriptions are 78 and 57 characters (limit 160). Both are first person (PRN-04).
- **COPY-settings.privacyTools:** no test or design board quotes the old wording. Only `src/generated/copy.ts` does, and `pnpm gen` regenerates it.
- **Shell variants:** only `src/pages/t/[id].astro` uses `variant="compact"`. Embedded and linked tool views therefore have no footer, and `404.astro` (full) has one, as AC3 expects. `<BaseLayout path>` already gives MOD-Shell what it needs for `aria-current`.
- **Fixtures:** "every content set has both files" also covers content written by tests at run time (`tests/unit/{about,resume,content-derived,content-validation,catalog-check,dist-size,offline}.test.ts`, `tests/perf/support/catalog-500.ts`), not just the 28 sets in `tests/fixtures/content/`. Plan for that in the build; the spec wording is sufficient.
- **Draft vs. specs:**
  - NFR-05/INV-05, RULE-07 (tools by others are linked) and F-003.R4 (new tab) match.
  - RULE-13 and F-006.R6 (60 dates, shown in Settings) match.
  - F-011 (offline copy), F-013 (export, import, erase) and D-051 (licence) match.
  - COPY-settings.privacyTools and COPY-settings.privacyHosting ("I don't use its analytics") match.
  - Limits fit: Privacy has 6 sections, Terms 8 (max 20), all headings are under 80 characters, every body is under 4000, and every link is https or mailto. The mailto links use the address as visible text (SCR-Policy accessibility).

---

## Major

### R2-M1 — The draft's list would render as a plain paragraph, and the build would not catch it
- `policy-drafts.md:37-40`: the lead-in "To make the portal yours, … on this device only:" and the three `- ` lines have no blank line between them, so they form one paragraph. The ADR note (`ADR-0005 … :214`) says "A paragraph whose **every** line starts with `- ` is a bulleted list". This paragraph therefore renders as literal text with "- the tools…" inside it. AC8 would pass on fixtures while the real Privacy page shows a broken list. Validation can't catch it: the text is valid, and other text "is literal text".
- Related: the ADR doesn't say which YAML block scalar to use. A folded scalar (`>`) joins the `- ` lines into one line, which silently turns any list into a paragraph.
- **Fix (do both a and b, or at least a):**
  a) Draft: put a blank line between line 37 and line 38 (the lead-in becomes its own paragraph, the three items a list). Add to "How the text maps to content" (`:26`): "A list is separated from the paragraph before it by a blank line."
  b) ADR-0005 note, first bullet after "A section's `body` is a block scalar": replace it with "A section's `body` is a literal block scalar (`|`). Paragraphs are separated by blank lines; a line break inside a paragraph reads as a space. A paragraph whose every line starts with `- ` is a bulleted list, one item per line. A paragraph where some lines start with `- ` and others don't is an error naming the section (`section <n> › SCHEMA: a list must be its own paragraph`)." Mirror the last sentence in F-018's Edge cases. (Optional: add it to AC10 as a second Given.)

---

## Minor (brief)
- **n1** `CMP-AppShell.md` Behavior ("never moves it into view and out again") and `MOD-Pages.md` WhatsNew ("it is not in view on first load"): this holds only when Home is taller than the viewport. In the empty state with few categories, or on tall screens (NFR-07 goes up to 2560 px), the footer is in view and jumps when what's new hydrates. Fix by making the layout guarantee it. CMP-AppShell → "The footer sits after the page content, which fills at least the height of the window, so the footer starts at or below the bottom of the first screen and content that appears late (what's new on Home) never moves anything in view." Change MOD-Pages to match: "…the main content has a minimum height of the viewport (MOD-Shell), so the footer starts below the first screen."
- **n2** ADR-0005 note (`:213`) and MOD-Content Load say "Every content set has both files, test fixtures included", but F-018.AC5 needs a set without `terms.yaml`. → "…test fixtures included, except the fixture for F-018.AC5." Also, MOD-Content's opening sentence (`MOD-Content.md:9`) still lists only "catalog, categories, profile, Now note and résumé"; add "and the two policies".
- **n3** `policy-drafts.md:34` "no analytics" sits next to `:56`, which says Cloudflare's dashboard always shows overall traffic numbers. This is internally inconsistent; NFR-05's "no analytics" means the portal's own. → "There are no accounts, no cookies, no ads, and no analytics or trackers of my own."
- **n4** `policy-drafts.md:72` "The tools I build don't change the files you open in them" and `:75` "…process it on your device and don't send it to me" are still firm promises that no spec backs (`specs/40-technical/tool-contract.md` doesn't require them). Owner's call: either add them to tool-contract.md or match `:47` ("are made to …").

---

## Triage (orchestrator, 2026-10-22)
- **R2-M1** fixed: blank line before the list in the draft; ADR-0005 note and MOD-Content require a literal block (`|`), and a folded body or a paragraph mixing `- ` lines with other lines is an error naming the section; F-018 edge case added.
- **n1** fixed: MOD-Shell keeps `<main>` at least the window height less the header, so the footer starts below the first screen; CMP-AppShell and MOD-Pages wording follow.
- **n2** fixed: the fixture rule covers content written by tests and excepts the F-018.AC5 fixture; MOD-Content's opening names the policies.
- **n3** fixed: "I run no analytics, ads or trackers".
- **n4** left to the Owner (D-057): the tool promises in the draft are scoped to "the tools I build"; adding them to tool-contract.md is the Owner's choice.
- Loop converged: no blockers or majors left. Lint 570 IDs, 0 errors, 0 warnings.
