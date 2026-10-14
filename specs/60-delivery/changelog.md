---
title: Spec changelog
status: draft
---

# Spec changelog

## 2026-10-13
- Initial spec tree written from the approved vision brief v2 (decisions D-001 to D-014).
- Spec review round 1 applied (see .build-my-app/reports/spec-review-round-1.md): open-mode default made optional in schema; INV-03/INV-04 reworded; RULE-01/02/03/04/05/08/10/12 sharpened; RULE-13 days-used added; new F-003.R8, F-006.R6, F-009.R4, F-014.R4/R5, F-015.R4; copy for actions, import reasons, buttons, previews; NFR-01/02/10/12 made measurable; ADR-0001 proposed. Product decisions D-015–D-018.
- Spec review round 2 applied (INV-04 eviction wording, reference environment, backup migration v1, copy/flow/component alignment).
- Profile gains an optional nickname (Owner: Nguyen Tri Thanh, nickname "Taro"); F-007.R5 and F-008.R1 updated.
- Gate G1 approved by the user. F-001–F-015 set to `ready` by Claude on the user's explicit instruction.
- Voice changed (user request): TaroKit speaks as Taro in the first person to the user (PRN-04 rewritten; copy.md rewritten; COPY-home.intro added; F-007.R5 references it). Behavior unchanged.
- Phase 3 decisions applied: RULE-10 (own forms allowed; best-effort enforcement), INV-03 (embedded tool never on the portal's own address), F-003.R8 (installed-app storage exemption). F-003 was ready; behavior clarified, not expanded.
- Change request (user, 2026-10-13): categories made first-class. Four categories (D-027), exactly one per tool (INV-07), category pages (new F-016, SCR-Category), browse-by-category row on home (F-007.R7, CMP-CategoryTile), category tints (RULE-14, tokens). F-002.R3/R4 changed from filtering to navigating to category pages; F-015 adds category previews. F-002, F-007 and F-015 are back to draft pending review.
- User approved the category change. F-002, F-007, F-015 and F-016 set to ready by Claude on the user's instruction. F-001.AC9 and F-011.AC8 added (clarifications to ready features).
- F-003.R8, AC3 and AC11 narrowed (user decision, from spikes SP-1/SP-3): the shared-data promise covers local key-value storage only, and clipboard refusal is tested where the browser can restrict it. F-003 stays ready.
- F-003.R8/AC11 conditioned on browsers that do not partition embedded storage (real-Safari result, user decision D-038). ADR-0001 accepted.
- Change request from the JSON Formatter (its D-008): F-012 now tells embedded tools the theme showing — R5/R6, AC5–AC7, scope updated; MOD-Theme/MOD-ToolHost updated; ADR-0011 (proposed) theme handoff. Catalog: json-formatter entry added, hidden until deployed.
- D-039 amends D-008: nothing is shared at runtime with tools except the theme showing. F-012 gains R5/R6 and AC5–AC10 (theme hand-off, from the JSON Formatter change request, reviewed); INV-05 and NFR-05 note the exception; ADR-0011 accepted. F-012 stays ready.
- Gate G3 approved by the user (2026-10-14): ADR-0002 to ADR-0010 accepted; dependency registry approved.
