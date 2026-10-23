---
id: F-013
title: Export and import personal data
status: shipped
milestone: M-1
priority: P1
personas: [PER-01]
entities: [ENT-PersonalData]
rules: [RULE-01, RULE-08, RULE-13]
screens: [SCR-Settings]
components: []
nfr: [NFR-05]
events: []
depends_on: [F-005, F-006, F-012]
---

## Intent
With no accounts or sync, a backup file is how the Owner moves favorites, recents, theme, language and days used between devices or keeps them safe (PRN-03).

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
- **AC1** Given favorites, recents, a theme, the language vi-VN chosen and days used, when the user exports on 2026-10-13, then a backup file with that date in its name is saved and contains them all. (R1)
- **AC2** Given a file that is not a backup file, when the user imports it, then the not-a-backup reason is shown and personal data is unchanged. (R2)
- **AC3** Given a backup file from a newer schema version, when the user imports it, then the newer-version reason is shown and nothing changes. (R2)
- **AC4** Given a backup file with the same tool twice in recents, when the user imports it, then the damaged reason is shown and nothing changes. (R2)
- **AC5** Given a backup file with no days-used data, when the user imports and confirms, then its favorites, recents and theme are imported and days used is empty. (R3, R4)
- **AC6** Given a valid backup file, when the user imports and confirms, then favorites, recents, theme, language and days used match the file. (R4)
- **AC7** Given a valid backup file, when the user imports and cancels, then nothing changes. (R4)
- **AC8** Given personal data exists, when the user confirms erase, then favorites, recents and days used are empty, the theme is system and the language follows the device. (R5)
- **AC9** Given settings is shown, when the user looks at export, then the note that tool data is not included is shown beside it. (R6)
- **AC10** Given a backup file with 21 recents, when the user imports it, then the too-many reason is shown and nothing changes. (R2)
- **AC11** Given English is showing by choice and a backup file from before languages (no language), when the user imports and confirms, then the stored choice is gone and the language follows the device. (R3, R4)
- **AC12** Given a backup file whose language is fr-FR, when the user imports it, then the damaged reason is shown and nothing changes. (R2)
- **AC13** Given a version-1 backup file with theme dark, when the user imports and confirms, then the theme is dark and the language follows the device. (R3)

## UX notes
Controls are in SCR-Settings (COPY-settings.export, COPY-settings.import, COPY-settings.erase); the palette also offers export (F-004.R5). Backups never leave the device by themselves (NFR-05).

## Edge cases
- The file has favorites for tools that don't exist here. They are kept and hidden under INV-04.
- The file is larger than any backup can be (over 256 KB). It is rejected as not a backup (COPY-import.notBackup) without being read.
- The file holds more than 60 days used (RULE-13). An exported file never does, so it is rejected as damaged (COPY-import.damaged); COPY-import.tooLarge names only favorites and recents.
- A file without a schema version is from before version 1 and is migrated (R3). A schema version that isn't a whole number of at least 1 is damaged.
- The device refuses the write on import or erase. The change lasts for this session only, and settings says so (COPY-settings.importUnsaved, COPY-settings.eraseUnsaved) instead of looking successful.
- A document from a newer version of the portal is on the device. Other changes never overwrite it (F-006.R4), but a confirmed import or erase replaces it, because that is what the user asked for.
- The export from settings fails (for example, its code can't load offline). Settings says so (COPY-settings.exportFailed).
- Other open windows pick up imported or erased data, as they do favorites (F-005 edge case).
- The picked file can't be read, or the import's code can't load (for example, offline before it was cached). Nothing changes, and settings says so (COPY-settings.importFailed) rather than calling the file damaged.
- The recents' times in the file are out of order, as after the clock moved backward (F-006 edge case). The file is valid, and recents keep the file's list order, which is RULE-01's newest first; the portal always accepts its own exports.
- Writing the erased data fails. The stored data is removed instead, so it is really gone; only if that fails too does settings say the erase wasn't saved.
