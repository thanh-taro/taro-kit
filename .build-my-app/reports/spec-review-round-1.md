# Spec review — round 1 (2026-10-13)

Reviewers: F-001–F-005, F-006–F-010, F-011–F-015, and one cross-cutting reviewer. Lint was clean before the review (0/0).
Found by more than one reviewer (high confidence): the open-mode default vs schema/INV-03; hidden favorites vs the 24 limit; missing copy (palette actions, import reasons, buttons); RULE-12 citing the wrong INVs; F-005 claiming palette pinning; the palette action/theme toggle semantics; the touch variant of first-visit copy.

## Blockers
- B1 openMode is required in the schema, but RULE-07 gives it a default; INV-03 vs RULE-10 on the permission default → fix the schema and INV-03.
- B2 Hidden favorites vs the 24 limit and schema maxItems → product decision.

## Majors (fix)
- F-001: categories cannot be hidden; R2 owns build validation and RULE-12 references it; AC1 should name the places and say the added date is today.
- F-002: search is a ranked list within the selected category; an unknown category falls back to All.
- F-003: a direct visit to a linked tool doesn't open automatically (decision); navigation outside the tool's own site is blocked, as an R plus an AC; same-site tool data (R8) plus ADR-0001.
- F-004: shortcut Mod+K; group order; empty-query caps and de-duplication; outcome of running a project; action copy plus ACs; drop "go to settings" (it is a page).
- F-005: scope says palette pinning (remove it); compact card favorite toggle.
- F-006: what counts as a visit; hidden entries count toward 20; ACs for embedded and for reappearing.
- F-007/F-010: relative dates are measured from the viewer's date; what's new shows one item per tool; ACs for the cap and the clock tick.
- F-009: a project address on the projects page.
- F-011: linked tools offline; tool addresses and not-found load offline; install prompt and update behavior (decisions).
- F-012: header/palette toggle semantics, with ACs.
- F-013: import reason copy; duplicate ids invalid; older versions migrated (decision); date format in the file name.
- F-014: definition of success (2xx, ≤5 redirects, 10 s, 1 retry); the embed-policy cases as ACs; report channel; scope wording.
- F-015: a hidden tool's preview shows not-found; meta copy; the site index lists portal addresses.
- Cross-cutting: INV-04 wording; the M-1 success measure (decision); NFR-01/02 reference device; NFR-12 measure; NFR-10 vendor names; bundled-only images (NFR-05); layer violations (COPY in rules, ENT in glossary, D-008 in F-012); README microseconds line.

## Minors: all applied as suggested.

## Disagreements
- Removing CMP-ToolHeader's slow variant: keep COPY-tool.slow only in the ToolHeader slow variant; SCR-ToolView references the component state. Applied rather than disagreed.
