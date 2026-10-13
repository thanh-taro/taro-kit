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
  - The standalone Ajv validator compiled from the domain `backupFile` schema runs first.
  - Then come checks the schema can't express: duplicate tool ids, newer schema version, and limit overruns.
  - Each failure maps to a reason: not a backup, damaged, newer version, or too large.
  - Older or partial files are migrated with defaults, then validated again.
- **Replace:** returns a validated payload, so the caller can confirm before `replaceAll`.

The module is lazy-loaded, so it costs nothing on home.

## Not responsible for
- The confirmation UI (MOD-Pages settings, MOD-Palette).
- Tool data, which is never included (F-013.R6).

## Public surface
- `exportBackup(now) → void`, which triggers the download.
- `parseBackup(file) → { ok: true, data } | { ok: false, reason }`.
- `migrate(raw) → PersonalData`.

## Implements
F-013.R1, F-013.R2 and F-013.R3, and the data side of F-013.R4 and F-013.R5. Export is reused by F-004.R5.
