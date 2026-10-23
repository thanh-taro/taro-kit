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
- Applying the theme or the language to the page (MOD-Theme, MOD-Language). It only stores the preferences.
- Deciding when a visit happens. Callers (MOD-ToolHost, MOD-Pages, MOD-Palette) report visits per F-006.R1.

## Public surface
- Signals: `favorites`, `recents` and `visibleFavorites(toolIds)`; `visibleRecents(toolIds, { excludeFavorites, max })`; `preferences`; `daysUsedLast14`; `storageAvailable`.
- Commands: `pin(id, visibleIds)`, which returns `ok` or `full`; `unpin(id)`; `recordVisit(id)`; `recordDay()`; `setTheme(theme)`; `setLanguage(lang | null)` (null: follow the device, F-019); `clearRecents()`; `replaceAll(data)`; `eraseAll()`; `snapshot() → PersonalData`.
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

### Recents and days used (F-006)
On the same store. Visibility works as for favorites; stored recents are never filtered at write time.
- `recents`: signal of every stored visit (`{ toolId, openedAt }`), newest first, including unknown or hidden tools (RULE-01, INV-04).
- `visibleRecents(visibleIds, { excludeFavorites = true, max = 8 })`: signal of the recents that may be shown, newest first: visible tools only, stored favorites left out, at most `max` (RULE-01). Hidden entries keep their place, so a tool shown again returns to its original position (F-006.R5).
- `recordVisit(id)`: the tool moves to the top with the current time, never duplicated; past 20 the oldest entry goes, whatever its visibility (RULE-01). Callers decide when a visit happens (F-006.R1).
- `recordDay()`: records today's local date once (RULE-13), newest first, the latest 60 kept; writes nothing when today is already recorded. A clock moved backward records its date as it is; stored dates more than one day ahead are dropped when recording (F-006 edge case).
- `today`: signal of today's local date from the store's clock; it moves on `recordDay()` and `refresh()`.
- `daysUsedLast14`: signal of the recorded dates within the last 14 days of `today`, today included; future dates are not counted.
- `replaceAll(data) → 'saved' | 'unsaved'` (F-013.R4) and `eraseAll() → 'saved' | 'unsaved'` (F-013.R5): callers confirm first. They write the whole document, and unlike every other change they also replace a newer version's document on disk, because the user asked for exactly that. `unsaved` when the device refuses the write; the change then lasts for the session only. When writing the erased document fails, `eraseAll` removes the stored document instead and reports `saved` if that works.
- `clearRecents() → 'saved' | 'unsaved'`: empties recents (callers confirm first, F-006.R4). `unsaved` when the change is not on the device (storage unavailable or failing, or a newer schema version on disk, which is never overwritten); recents are then cleared for this session only.
- `update(recipe) → boolean`: true when the new document was saved on the device.
- Read validation (ADR-0010 repair): tool ids must match the catalog `slug` (pattern, at most 48 characters), `openedAt`/`pinnedAt` must be ISO timestamps on real dates, and days used real calendar dates; invalid entries are dropped, never fatal (`isToolId`, `isTimestamp`, `isCalendarDate`).
- `createPersonalDataStore({ storage, events, now })`: `now` is the clock (default `new Date()`), injectable for tests.
- Pure versions (`recents.ts`, `days-used.ts`): `recordRecentVisit(doc, id, openedAt)`, `clearRecentVisits(doc)`, `visibleRecents(doc, visibleIds, options)`, `RECENTS_LIMIT` (20), `RECENTS_SHOWN` (8); `recordDayUsed(doc, today)`, `daysUsedInLast14(daysUsed, today)`, `daysUsedWindow(daysUsed, today)` (the 14 days, oldest first, for the settings strip), `DAYS_USED_LIMIT` (60), `DAYS_USED_WINDOW` (14), `DAYS_USED_FUTURE_TOLERANCE` (1).
- Local dates (`dates.ts`, platform-mapping): `localDate(date)` and `daysBetween(from, to)`, shared with MOD-Pages' what's new.

## Implements
F-005 (all requirements), F-006.R2, F-006.R3, F-006.R5 and F-006.R6, and the storage part of F-012.R4. It contributes to NFR-05.
