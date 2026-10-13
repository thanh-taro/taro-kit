# Design plan (phase 2)

Tool: Claude Design canvas (D-020). Style: Night Market (D-019). Naming follows adapters/design.md.

## Inventory
| Spec | States / variants | Frames |
|---|---|---|
| SCR-Home | default, empty, error (storage) | 3 |
| SCR-Catalog | default, empty, no-results | 3 |
| SCR-ToolView | embedded, loading, slow, offline, linked | 5 |
| SCR-About | default | 1 |
| SCR-Projects | default, empty | 2 |
| SCR-Now | default (incl. stale), empty | 2 |
| SCR-Settings | default, import error, confirm dialog | 3 |
| SCR-NotFound | default | 1 |
| CMP-AppShell | full, compact, narrow, offline, update ready | 5 |
| CMP-ToolCard | regular, compact, unavailable, hover/focus | 4 |
| CMP-ToolHeader | default, slow | 2 |
| CMP-CommandPalette | empty query, results, no results, copied | 4 |
| CMP-FavoriteToggle | off, on, refused | 3 |
| CMP-ProjectCard | with image, without image | 2 |
| CMP-StateMessage | empty, no-results, offline, info, not-found | 5 |

That is 20 screen states and 25 component variants. **Themes:** every frame in dark. Light is designed for every component variant and every screen's default state. **Mobile (390):** the default state of every screen.

## Phases
- **D1 · Components.** All 25 variants in dark and light, built from the tokens.
- **D2 · Primary flow (FLOW-01).** Home default → palette results → tool view embedded, plus the linked note. Desktop and mobile, dark and light.
- **D3 · Remaining defaults.** Catalog, About, Projects, Now, Settings, NotFound. Desktop dark and light, mobile dark.
- **D4 · Edge states.** Home empty/error; catalog empty/no-results; tool view loading/slow/offline; projects empty; Now empty and stale; settings import error and confirm.

Each phase runs make → design-auditor (spec coverage) → ui-critic (screenshots) → fix, with at most 3 rounds, then you review.
