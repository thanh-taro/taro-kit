# Spec review — D-055 (remove the Projects page), 2026-10-20

Lint: `python3 tools/spec_lint.py` → 543 IDs, 2292 references, 0 errors, 0 warnings.
Counts: **0 blocker, 3 major, 8 minor.**

## Verdicts
| Item | Verdict |
|---|---|
| F-001 | ready |
| F-004 | ready after minor fixes (AC4 is a major finding but the fix is small) |
| F-008 | ready |
| F-014 | ready (AC8 is valid and doesn't duplicate AC10; R4 is fully covered by AC8 and AC10) |
| F-015 | ready |
| F-009, SCR-Projects, CMP-ProjectCard, ENT-Project | deprecated correctly: IDs kept and not reused; COPY rows kept and marked |
| RULE-12 (rules.md) | not ready, see M1 |
| Change as a whole | ready after fixes M1–M3 |

## Major

**M1 — specs/10-domain/rules.md:23 (RULE-12) still says project links exist.**
"Unreachable project or profile links are reported as warnings and do not block." This contradicts F-014.R4, MOD-CatalogCheck and model.md. It is the rule F-014 implements.
Fix: "Unreachable profile links are reported as warnings and do not block."

**M2 — specs/60-delivery/changelog.md (end, after line 91): no D-055 entry.**
F-001, F-004, F-008, F-014 and F-015 are `shipped`, and their behavior changed (removed nav item, palette group, About link, check scope, site index page). specs/README.md Change process step 3 requires a changelog entry.
Fix: add `## 2026-10-20` entry: "Change (Owner decision D-055): the projects showcase is removed. F-009, SCR-Projects and CMP-ProjectCard are deprecated; ENT-Project is deprecated and the schema no longer accepts `kind: project`. F-001.R1/R4/AC6, F-004.R2–R4/AC4/AC5, F-008.R3/AC5, F-014.R4/AC8 and F-015.R1 are updated; RULE-06, RULE-12, INV-01 and INV-02 no longer mention projects. COPY-nav.projects, COPY-palette.groupProjects, COPY-projects.* and COPY-meta.projects* are retired. `/projects/` is no longer built. spec_lint lets the changelog and feature index name deprecated items."

**M3 — specs/20-features/F-004-command-palette.md:36 (AC4) can't fail.**
For "uni", no page (Home, Tools, About me, Résumé, Now, Settings) and no action (COPY-palette.actionTheme/actionExport/actionCopy) matches. Groups with no match are left out (MOD-Search), so "before the Pages and Actions groups" compares against groups that aren't there. R3's group order (Tools, Pages, Actions) is now only tested for Tools→Pages, and only indirectly through AC5.
Fix: "**AC4** Given a tool "Tomato Timer", when the user types "to", then the groups appear in the order Tools (Tomato Timer), Pages (Tools) and Actions (COPY-palette.actionTheme, COPY-palette.actionCopy). (R3)". As an alternative that also proves group order beats rank: "Given a tool "Nowcast", when the user types "now", then Nowcast under Tools comes before the page Now under Pages, even though Now matches exactly. (R3)"

## Minor

**m1 — specs/20-features/F-004-command-palette.md:37 (AC5).**
The AC is valid under RULE-05: "Tab Tamer" is a name-contains match for "ab" and "About me" (COPY-nav.about) is a name-prefix match. No action or other page contains "ab", and the first result is highlighted (CMP-CommandPalette), so Down once lands on About. The problem is the Given: it doesn't rule out other fixture tools containing "ab" (for example "Table…"), which would move the About row.
Fix: "Given the query "ab" shows exactly the tool "Tab Tamer" under Tools and the page About me under Pages, …"

**m2 — specs/40-technical/adr/ADR-0005-yaml-content-validated-by-domain-json-schema.md:16, :23, :48 still describe projects.**
They mention `content/projects/<id>.yaml`, "unique ids across tools and projects" and `unevaluatedProperties: false` on "tool and project". This accepted ADR defines the content layout.
Fix: add "## Amendment D-055 (2026-10-20)": "Projects are removed: there is no `content/projects/` folder, ids are unique across tools (INV-01), and `unevaluatedProperties: false` applies to tool. A leftover file with `kind: project` fails schema validation."

**m3 — specs/40-technical/adr/ADR-0002-astro-static-preact-islands.md:11, :18 list Projects and the projects route.**
Fix: in the existing Amendments section, add "D-055: the projects route is removed; the pre-rendered routes are home, tools, category pages, `/t/<id>/`, about, résumé, now, settings and not-found."

**m4 — specs/40-technical/dependencies.md:26 (DEP-31) gives "avatar and project images" as the purpose.**
Fix: "Image optimization for the avatar; rasterizing the shared link-preview image (MOD-Meta)".

**m5 — specs/60-delivery/roadmap.md:9 says "F-001 to F-016", which still includes F-009.**
"Done when: every M-1 acceptance criterion passes" would then include F-009's ACs.
Fix: "F-001 to F-017, except F-009 (deprecated, D-055)". F-017 is M-1 per _index.

**m6 — The fate of the shipped `/projects/` address is not specified.** It was live in v1.0.0 and listed in the site index. Possible places: specs/40-technical/modules/MOD-Pages.md near :16, platform-mapping.md:16, or F-015 edge cases.
An implementer could add a redirect to /about/ or leave it as 404.
Fix: in MOD-Pages, "`/projects/` and `/projects/images/*` are no longer built (D-055); they serve the not-found page (F-003.R7), and the site index leaves them out (F-015.R3)."

**m7 — specs/40-technical/modules/MOD-Content.md:45: `IMAGE_TYPES`/`imageType` are now described as "the table behind asset validation", but the only remaining image field (the avatar) uses `AVATAR_TYPES`.** The image route that needed `imageType` is gone.
Fix: either name the field that still uses `IMAGE_TYPES` (for example tool/category icons), or drop `IMAGE_TYPES`/`imageType` and keep `AVATAR_TYPES` as the one table.

**m8 — specs/README.md:79 says deprecated items "must not be referenced by non-deprecated items".** tools/spec_lint.py now exempts `60-delivery/changelog.md` and `20-features/_index.md`. The rule and the tool disagree.
Fix: "deprecated — kept for history; must not be referenced by non-deprecated items, except the changelog and the feature index."

## Checked, no finding
- Schema: `link` is still used (profile links, line 277). `assetPath`, `entryBase` (tool) and `secureUrl` are still used. No dangling `#/$defs/project` ref. `kind` enum is `["tool"]`.
- INV-01/INV-02, RULE-06, glossary, model.md ENT-CatalogEntry/ENT-Project: consistent.
- F-014: AC8 (timeout, retried per RULE-12) and AC10 (4xx, not retried) are different cases. R4 is covered by both. The edge case and MOD-CatalogCheck are consistent.
- MOD-Offline precache, MOD-Search/MOD-Palette groups, architecture data flow, platform-mapping, CMP-AppShell, CMP-CommandPalette, SCR-About/SCR-Resume exits, FLOW-02: no remaining project references.
- NFRs (50-quality): no project images mentioned. PER-02 "what Taro has built" is still served by tools, About and Résumé.
- Deprecated COPY rows: referenced only by deprecated F-009, SCR-Projects and the changelog.
- spikes.md, ADR-0006/0007 "projects": unrelated meanings or history.

## Outside specs (implementation follow-up, not a spec defect)
Tests and fixtures still cover projects: tests/unit/projects.test.ts, tests/fixtures/content/F001_AC6-hidden-entries/projects/, tests/fixtures/content/F005-favorites/projects/*.yaml (would now fail schema validation), and project cases in tests/unit/{palette,catalog-check,content-validation,content-derived,meta,offline,about}.test.ts and tests/e2e/{shell,about,flows}.spec.ts. Remove them or re-cite them against the new F-001.AC6, F-004.AC4/AC5, F-008.AC5 and F-014.AC8.
