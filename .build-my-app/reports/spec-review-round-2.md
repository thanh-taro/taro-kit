# Spec review — round 2 (verification)

Two reviewers checked the round-1 fixes; every round-1 finding was confirmed resolved.

## New majors (all fixed)
- INV-04 contradicted the RULE-01/RULE-02 eviction: reworded, plus F-005.R4 and F-006.R5.
- NFR-01/02/10 pointed to an undefined reference environment: added specs/40-technical/reference-environment.md.
- F-013 migration was undefined: RULE-08 now says schema v1 and how missing parts get defaults; AC5 rewritten.
- The backup copy left out days used: COPY-settings.backupScope and COPY-settings.importConfirm fixed.
- FLOW-03 cited F-013.R3 where R4 was meant: fixed.
- CMP-ToolCard's unavailable state did not match F-011.R3: fixed.

## Minors (all applied)
- F-004 Pages defined; favorites capped at 8; when the palette closes.
- F-003.R8 cites ADR-0001/SP-1; popup edge case.
- F-013.AC10 (too large); F-014.AC10 (profile link); F-015.R4 copy; F-011.AC4 (not-found offline); RULE-08 now cites RULE-13.

## Verdict
After the fixes there are no blockers or majors left. Converged.
