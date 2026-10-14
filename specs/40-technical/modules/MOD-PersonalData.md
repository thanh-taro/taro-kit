---
id: MOD-PersonalData
title: Personal data store
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-PersonalData owns ENT-PersonalData on the device (ADR-0010).
- **Storage:** one versioned localStorage document, an in-memory fallback when storage is unavailable, and sync across windows.
- **Rules as pure functions:**
  - recents (RULE-01);
  - favorites with the visible limit and the drop-hidden-first behavior (RULE-02);
  - days used (RULE-13);
  - INV-04 filtering of unknown or hidden ids at read time, never at write time.
- **Reactive signals** so every island updates at once (F-005.R1).
- Nothing it holds is ever sent over the network (INV-05).

## Not responsible for
- File export and import (MOD-Backup).
- Applying the theme to the page (MOD-Theme). It only stores the preference.
- Deciding when a visit happens. Callers (MOD-ToolHost, MOD-Pages, MOD-Palette) report visits per F-006.R1.

## Public surface
- Signals: `favorites`, `recents` and `visibleFavorites(toolIds)`; `visibleRecents(toolIds, { excludeFavorites, max })`; `preferences`; `daysUsedLast14`; `storageAvailable`.
- Commands: `pin(id, visibleIds)`, which returns `ok` or `full`; `unpin(id)`; `recordVisit(id)`; `recordDay()`; `setTheme(theme)`; `clearRecents()`; `replaceAll(data)`; `eraseAll()`; `snapshot() → PersonalData`.
- `readStoredTheme()`, a dependency-free helper whose source is inlined by MOD-Theme.

### Favorites (F-005)
All on the page's store, `personalData()` (`src/modules/personal-data/`). `visibleIds` are the visible tool ids from MOD-Content (`virtual:tarokit/visible-tool-ids` in islands); stored favorites are never filtered at write time.
- `favorites`: signal of every stored favorite (`{ toolId, pinnedAt }`), in pin order, oldest first, including unknown or hidden tools.
- `visibleFavorites(visibleIds)`: signal of the favorites that may be shown, in pin order (RULE-02, INV-04).
- `isFavorite(id)`: whether the tool is stored as a favorite; reactive inside a computed or effect.
- `pin(id, visibleIds) → 'ok' | 'full'`: appends the tool; `full` refuses a 25th visible favorite and changes nothing; when storage would exceed 24, the oldest unknown or hidden favorites are dropped first (RULE-02). Already pinned is `ok`.
- `unpin(id)`.
- Pure versions for tests and other rule callers (`favorites.ts`): `pinFavorite(doc, id, visibleIds, pinnedAt)`, `unpinFavorite(doc, id)`, `visibleFavorites(favorites, visibleIds)`, `isFavorite(doc, id)`, `FAVORITES_LIMIT` (24).
- With storage unavailable every command works in memory for the session; `storageAvailable` is false and MOD-Shell shows the notice (F-005.R5).

## Implements
F-005 (all requirements), F-006.R2, F-006.R3, F-006.R5 and F-006.R6, and the storage part of F-012.R4. It contributes to NFR-05.
