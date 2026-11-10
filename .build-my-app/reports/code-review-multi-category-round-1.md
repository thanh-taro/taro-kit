# Code review — multi-category tools, round 1

Reviewer: code-reviewer. No correctness bugs or spec deviations.
- relevantErrors: the tool's category oneOf is the only root-level oneOf; INV-09 name-field handling unaffected.
- Consumers: membership via `categoriesOf` (category pages, nav, home tiles, sitemap); main `category` for search cards,
  palette and every card label (D-074); announced count counts each tool once (D-073).

| # | Sev | Finding | Triage |
|---|---|---|---|
| 1 | low | `categories: [nope, nope]` printed the missing-category error twice (F-001.R2 one error per mistake) | Fixed: each listed id is checked once; test `INV-07 reports a repeated unknown category once…` |

Outcome: converged in one round.
