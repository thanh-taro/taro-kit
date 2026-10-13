# Gate G2: Design

| Check | Result | Evidence |
|---|---|---|
| Every M-1 screen state and component variant has a design | pass | 38 boards: D1 components (9), D2 flow (7), D3 screens (14), D4 edge states (8). States come from the tweaks (adapters/design.md) |
| Design auditor reports no blockers | pass | D1, D2 and D3 converged; D4 converged in round 2 (reports design-D*-round-*.md) |
| Every text uses a COPY ID | pass | every data-copy ID used resolves in copy.md; sample content is labeled |
| Only tokens used | pass | font sizes {12,13,14,15,16 input,17,20,24,28,36,44,72}; radii {7,10,12,14,999}; colors equal tokens.json |
| Contrast | pass | tools/token_contrast.py: 0 failing pairs in both themes, including category tints |
| Touch targets of 44 px or more | pass | audited in every round; mobile primary actions are 48–52 px |
| Design adapter matches the tool | pass | adapters/design.md describes the Claude Design canvas, tweaks and naming |
| Spec lint | pass | 0 errors, 0 warnings |

Canvas: https://claude.ai/artifact/64r5hyDPKT37fo6TDZ5ptV (v49). Repo snapshot: design/canvas/.
Style: Night Market (D-019). Voice: Taro speaks in the first person (PRN-04). Categories: D-027 to D-031.
Open minors (accepted): decorative glyphs have no data-copy; the edge-state favorite cards have no toggle; there are no mobile frames for the catalog and empty-page states (same component at phone width).
