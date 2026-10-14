---
id: ADR-0010
title: Personal data stored as one versioned localStorage document, with in-memory fallback
status: accepted
date: 2026-10-13
supersedes: []
---

## Context
Personal data (ENT-PersonalData) is small: at most 24 favorites, 20 recents, 60 dates and one preference, so it fits in a few KB. It must:
- stay on the device (INV-05, NFR-05);
- survive restarts (F-005.R2, F-006.R3);
- be readable **synchronously before first paint**, so the theme never flashes (F-012.R4) and home's lists render on hydration without a loading flicker (NFR-01);
- sync between open windows by last write wins (F-005 edge case);
- degrade to session-only memory when storage is unavailable (F-005.R5, F-012 edge case);
- map one-to-one to the backup file shape (RULE-08).

## Decision
- Store one JSON document under the key `tarokit.personal`, shaped exactly like `personalData` in the domain schema, with `schemaVersion: 1`.
- Read it synchronously at startup, both in the inline theme script and in MOD-PersonalData.
- Every mutation writes through the whole document. Mutations are pin, unpin, record visit, record day, set theme, clear recents, replace on import, and erase.
- Other windows pick up changes from the `storage` event and by re-reading on `focus`.
- An unreadable or invalid stored document is treated like a damaged backup. Its valid parts are migrated with defaults (RULE-08), and the result is rewritten. Nothing is thrown at the user.
- **Availability check:** at startup, write and remove a probe key. If that fails, use an in-memory store for the session and show the one-time notice (COPY-storage.unavailable).
- `navigator.storage.persist()` is **not** requested for now, because Gecko prompts the user for it. Eviction risk is covered by backups (F-013).

## Alternatives considered
- **IndexedDB, raw or through a small wrapper.** Asynchronous, so it can't drive the first painted theme. It is also heavier, and the data doesn't need it.
- **Separate keys per collection.** This allows partial writes and can tear across windows. One document is atomic per write.
- **Cookies.** Sent over the network, so they violate INV-05 and NFR-05.
- **OPFS or the Cache API.** Asynchronous, and overkill for a few KB.

## Consequences
- Rule logic (RULE-01, RULE-02, RULE-13 and INV-04) is pure functions over the document. They are trivially unit-testable.
- Safari's script-writable storage cap (ITP) can erase data after 7 days of browser use without visiting the portal. Installed web apps are exempt. The Owner is expected to use the portal daily, and backups cover the remaining risk. This is recorded in the risks list.
- On iOS, an installed web app has its own storage, separate from Safari tabs. Personal data and tool data can differ between the installed portal and the browser (see SP-1 and SP-4 in `spikes.md`).
