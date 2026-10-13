# Category change: review round 1

4 majors and 5 minors, all applied.
- The technical layer now uses category pages: platform-mapping, MOD-Pages (`/tools/<category-id>/` route, F-016 in its Implements list), MOD-Search (no categoryId) and the MOD-Meta sitemap.
- SCR-Home empty state includes the category row.
- F-016 NFRs; F-011.AC8 covers category pages offline.
- RULE-14 tints are unique across all categories; F-001.R2 enforces it, with new F-001.AC9.
- Minors: category pages added to RULE-06 and F-001.R4/AC6; F-016 cites F-002.R1; toolCountOne referenced; exits; ADR-0005 build checks.

Kept `/tools/<category-id>/`, as shown to the user, instead of the reviewer's suggested `/c/<id>/`.
