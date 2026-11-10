# Spec review — multi-category tools (CR from Image Annotator D-042), round 1

Reviewer: spec-reviewer. Lint 0 errors. Schema compiled with Ajv 2020 and checked on 6 entries (valid: `category`;
`categories: [developer, media]`; refused: both, neither, `[]`, `[media, media]`).

| # | Sev | Finding | Triage |
|---|---|---|---|
| 1 | major | F-002 edge case: "catalog tool count" isn't user-visible | Fixed: names the announced result count; F-002.AC11 asserts it |
| 2 | major | Two cards for one tool: favorite state not required to stay in sync | Fixed: F-002.AC12 |
| 3 | minor | RULE-14 count-once-each has no home AC | Fixed: F-007.AC13 |
| 4 | minor | F-001.R5 only tested with a single `category` | Fixed: F-001.AC11 |
| 5 | minor | F-016 edge case (only tool has another main category) untested | Fixed: F-016.AC8 |
| 6 | minor | F-001/F-002/F-016 stay `shipped` while behavior changes | Accepted: set to `ready` on the Owner's approval (only the Owner moves items to ready) |

Build follow-ups (module docs, at build): MOD-Content (`categories[]` + main `category`, membership in
`toolsByCategory`/`visibleCategories`), MOD-Pages (`categoryRow`/`categoryPages` by membership, `catalogView.total`
distinct, unique DOM ids for duplicate cards), MOD-DesignSystem (`categoryName` = main), MOD-Search (`filterCatalog`
returns each tool once). E2E selectors that find a card by name may now match two cards.

No change needed: F-004 palette and RULE-05 (no category), F-015 site index, SCR-Catalog/SCR-Category, ADR-0005.

Outcome: converged (no blockers; the fixes are the reviewer's own suggested wording, additive ACs only).
