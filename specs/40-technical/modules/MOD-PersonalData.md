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
- Commands: `pin(id)`, which returns `ok` or `full`; `unpin(id)`; `recordVisit(id)`; `recordDay()`; `setTheme(theme)`; `clearRecents()`; `replaceAll(data)`; `eraseAll()`; `snapshot() → PersonalData`.
- `readStoredTheme()`, a dependency-free helper whose source is inlined by MOD-Theme.

## Implements
F-005 (all requirements), F-006.R2, F-006.R3, F-006.R5 and F-006.R6, and the storage part of F-012.R4. It contributes to NFR-05.
