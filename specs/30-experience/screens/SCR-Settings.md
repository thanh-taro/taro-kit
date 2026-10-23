---
id: SCR-Settings
title: Settings
status: draft
features: [F-012, F-019, F-013, F-006]
components: [CMP-AppShell]
---

## Purpose
Theme, language, backup and privacy controls.

## Layout regions
1. Shell header.
1b. Page heading (COPY-settings.title).
2. Appearance (COPY-settings.appearance): theme choice (COPY-settings.theme; options COPY-settings.themeSystem, COPY-settings.themeLight, COPY-settings.themeDark); language choice as radio buttons (COPY-settings.language; options COPY-language.device, COPY-language.en and COPY-language.vi, the last two each marked with its own language; F-019.R2). With no stored choice, COPY-language.device is selected. Page title and description: COPY-meta.settingsTitle, COPY-meta.settingsDescription.
3. Your data (COPY-settings.yourData): export (COPY-settings.export) with the backup scope note (COPY-settings.backupScope), import (COPY-settings.import), days used (COPY-settings.daysUsed), clear recents (COPY-settings.clearRecents), erase all (COPY-settings.erase).
4. Privacy (COPY-settings.privacyTitle): statement in three paragraphs (COPY-settings.privacy, COPY-settings.privacyTools, COPY-settings.privacyHosting).

## States
| State | When | What the user sees |
|---|---|---|
| default | | controls |
| empty | n/a | — |
| loading | importing | progress on the import control |
| error | invalid import | COPY-settings.importInvalid |
| error | cleared recents could not be saved on the device | COPY-settings.clearRecentsUnsaved, announced (F-006.R4) |
| error | an import or erase could not be saved on the device | COPY-settings.importUnsaved or COPY-settings.eraseUnsaved, announced (F-013 edge cases) |
| error | the picked file couldn't be read, or the import couldn't load | COPY-settings.importFailed, announced, nothing changed (F-013 edge cases) |
| error | export failed | COPY-settings.exportFailed, announced (F-013 edge cases) |

Confirmations: COPY-settings.importConfirm, COPY-settings.clearRecentsConfirm, COPY-settings.eraseConfirm, each with COPY-common.confirm and COPY-common.cancel. Import reasons: COPY-import.notBackup, COPY-import.damaged, COPY-import.newerVersion, COPY-import.tooLarge.

## Entry & exit
- Entered from: shell navigation, the palette, FLOW-03.
- Exits to: anywhere.

## Accessibility
Destructive actions need a confirmation step that is reachable by keyboard, with focus moving into it.
