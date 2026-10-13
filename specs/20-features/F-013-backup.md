---
id: F-013
title: Export and import personal data
status: ready
milestone: M-1
priority: P1
personas: [PER-01]
entities: [ENT-PersonalData]
rules: [RULE-08]
screens: [SCR-Settings]
components: []
nfr: [NFR-05]
events: []
depends_on: [F-005, F-006, F-012]
---

## Intent
With no accounts or sync, a backup file is how the Owner moves favorites, recents, theme and days used between devices or keeps them safe (PRN-03).

## Scope
- In: exporting personal data to a file; importing with validation, migration and confirmation; erasing all personal data.
- Out: tool data (each tool owns it); automatic sync (M-3 at the earliest).

## Requirements
- **R1** The user can export all personal data (from settings or the palette) to a backup file saved on the device, named with the local date as YYYY-MM-DD.
- **R2** The user can import a backup file. It is fully validated first (RULE-08). An invalid file is rejected with its reason and nothing changes (COPY-settings.importInvalid with COPY-import.notBackup, COPY-import.damaged, COPY-import.newerVersion or COPY-import.tooLarge).
- **R3** A file from an older schema version, or one missing optional parts, is migrated with defaults, then validated (RULE-08).
- **R4** A valid import replaces the current personal data only after the user confirms (COPY-settings.importConfirm).
- **R5** The user can erase all personal data on this device after confirming (COPY-settings.eraseConfirm).
- **R6** Settings explains that tool data is not included in the backup (COPY-settings.backupScope).

## Acceptance criteria
- **AC1** Given favorites, recents, a theme and days used, when the user exports on 2026-10-13, then a backup file with that date in its name is saved and contains them all. (R1)
- **AC2** Given a file that is not a backup file, when the user imports it, then the not-a-backup reason is shown and personal data is unchanged. (R2)
- **AC3** Given a backup file from a newer schema version, when the user imports it, then the newer-version reason is shown and nothing changes. (R2)
- **AC4** Given a backup file with the same tool twice in recents, when the user imports it, then the damaged reason is shown and nothing changes. (R2)
- **AC5** Given a backup file with no days-used data, when the user imports and confirms, then its favorites, recents and theme are imported and days used is empty. (R3, R4)
- **AC6** Given a valid backup file, when the user imports and confirms, then favorites, recents, theme and days used match the file. (R4)
- **AC7** Given a valid backup file, when the user imports and cancels, then nothing changes. (R4)
- **AC8** Given personal data exists, when the user confirms erase, then favorites, recents and days used are empty and the theme is system. (R5)
- **AC9** Given settings is shown, when the user looks at export, then the note that tool data is not included is shown beside it. (R6)
- **AC10** Given a backup file with 21 recents, when the user imports it, then the too-many reason is shown and nothing changes. (R2)

## UX notes
Controls are in SCR-Settings (COPY-settings.export, COPY-settings.import, COPY-settings.erase); the palette also offers export (F-004.R5). Backups never leave the device by themselves (NFR-05).

## Edge cases
- The file has favorites for tools that don't exist here. They are kept and hidden under INV-04.
