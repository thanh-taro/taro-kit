---
id: MOD-Backup
title: Backup export and import
status: draft
depends_on: [MOD-PersonalData]
---

## Responsibility
MOD-Backup handles backup files (RULE-08).
- **Export:** wraps `snapshot()` in a backup file and saves it as `tarokit-backup-YYYY-MM-DD.json`, named with the local date, through a Blob download.
- **Import:** reads a picked file and validates it fully before anything changes.
  - The File API only: a file over 256 KB (`MAX_BACKUP_BYTES`) is not a backup and is not read; otherwise `text()`, then `JSON.parse` in a try/catch. Nothing is evaluated, uploaded or put in an address.
  - Not an object with `format: "tarokit-backup"`: not a backup. Unparseable, unreadable, no `data` object, a schema version that isn't a whole number of at least 1, or an `exportedAt` that isn't a timestamp: damaged. A schema version above 1: newer version (checked before anything else in `data`).
  - Older or partial files are migrated with defaults (`migrate`), then validated.
  - Over 24 favorites or 20 recents: too large. Over 60 days used: damaged (F-013 edge case).
  - The rest reuses MOD-PersonalData's document rules rather than a second validator: the migrated data is valid only when `normalizeDocument` leaves it unchanged, so duplicate tool ids or dates, ids that aren't catalog ids, times that aren't ISO timestamps on real dates, unknown fields and wrong types are all damaged. The result is that normalized copy, which holds only known fields (prototype-pollution safe).
- **Replace:** returns a validated payload, so the caller can confirm before `replaceAll`.

The module is lazy-loaded, so it costs nothing on home.

## Not responsible for
- The confirmation UI (MOD-Pages settings, MOD-Palette).
- Tool data, which is never included (F-013.R6).

## Public surface
- `exportBackup(now) → void`, which triggers the download. Built with F-004 (the palette's export action): `exportBackup(now = new Date(), env?)` with an injectable `{ snapshot, download }`, plus `backupFile(data, now)` (`{ format: "tarokit-backup", exportedAt, data }`) and `backupFileName(now)`. The file is pretty-printed JSON.
- `parseBackup(file) → Promise<{ ok: true, data } | { ok: false, reason }>`, with `reason` one of `notBackup`, `damaged`, `newerVersion`, `tooLarge`; `parseBackupText(text)` and `validateBackup(raw)` are its synchronous steps; `MAX_BACKUP_BYTES`.
- `migrate(raw)`: the file's `data` with missing parts defaulted and the current schema version, ready for validation.

## Implements
F-013.R1, F-013.R2 and F-013.R3, and the data side of F-013.R4 and F-013.R5. Export is reused by F-004.R5.
