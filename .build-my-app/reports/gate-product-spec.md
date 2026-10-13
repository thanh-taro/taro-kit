# Gate G1 — Product & spec

| Check | Result | Evidence |
|---|---|---|
| Lint 0 errors / 0 warnings | pass | `spec_lint.py`: 368 IDs, 692 refs, 0/0 |
| Every feature has R and AC | pass | 15 features, 76 R, 113 AC; every R is covered (lint) |
| No open product decisions | pass | `decide list --open` is empty; D-001–D-018 answered |
| Last review round had no blockers | pass | round 2: 0 blockers; its majors were fixed and lint-verified (spec-review-round-2.md) |

## Produced
- 00-product: vision, 2 personas, 5 principles, glossary
- 10-domain: 9 entities, 6 invariants, 13 rules, JSON schema
- 20-features: 15 M-1 features (P0: 9, P1: 5, P2: 1)
- 30-experience: 8 screens, 7 components, 3 flows, about 100 copy strings
- 40-technical: ADR-0001 (proposed), reference environment
- 50-quality: 12 NFRs; no analytics
- 60-delivery: roadmap M-1, M-2, M-3; changelog

## Open risks → phase 3
- Spikes SP-1 to SP-5. SP-1 gates ADR-0001 and F-003.R8.
- Domain purchase and hosting accounts are hard stops in phase 6.
- Profile and Now content is needed from the Owner before release.
