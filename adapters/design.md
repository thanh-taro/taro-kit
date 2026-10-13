# Design adapter — Claude Design canvas

Tool: a Claude Design artifact (live artboards on a canvas), decision D-020. The canvas is a derived artifact: the specs stay the source of truth.

## Naming
- Screen artboards: one per screen state (or flow step) and viewport, titled `<SCR-ID> / <state> / <viewport>`. Theme, and where useful the state, are **tweaks** on the artboard (Tweaks panel). State × theme coverage counts a tweak value as a frame.
- Components: one artboard per component (`CMP-<Name>.dc.html`), holding every row of its "Variants & states" table for both themes. Each cell is labeled `<CMP-ID> / <variant> / <theme>`.
- Flows: `<FLOW-ID> / step <n>`.
- Viewports: desktop 1440 wide; mobile 390 wide for every screen's default state (NFR-07).

## Tokens
- In code, tokens are generated from `specs/30-experience/tokens.json` as CSS custom properties: `--tk-color-<role>`, `--tk-space-<n>`, `--tk-radius-<name>`, `--tk-font-<role>`. The dark theme sets them on `:root`, the light theme under `[data-theme="light"]`.
- Artboards render both themes side by side, so they declare the color roles as short custom properties (`--bg`, `--fg`, `--accent`…) scoped to `.tk-dark` / `.tk-light`. Every value must equal tokens.json. Spacing, radius and type sizes are written as their token values (4-pt grid; radius 7/10/12/14). A value with no token is a finding.

## Copy
- Every visible string comes from `specs/30-experience/copy.md`. Each text element carries `data-copy="<COPY-ID>"` so the design auditor can trace it.
- Sample content (tool names, profile, Now text) is labeled as sample and never presented as real data.

## Review
Each artboard links its spec ID. The design-auditor checks coverage (state × theme), COPY IDs and tokens. The ui-critic reviews screenshots.
