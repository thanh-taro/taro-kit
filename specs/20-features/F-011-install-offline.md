---
id: F-011
title: Install and work offline
status: building
milestone: M-1
priority: P0
personas: [PER-01]
entities: [ENT-Tool]
rules: []
screens: [SCR-ToolView, SCR-NotFound]
components: [CMP-AppShell, CMP-ToolCard]
nfr: [NFR-06]
events: []
depends_on: [F-003]
---

## Intent
The Owner installs the portal to the dock or home screen, and it opens instantly, even with no connection, like a native launcher (PRN-02, PRN-05).

## Scope
- In: being installable through the browser's own install option; offline availability of the portal itself; offline indication; picking up a new version.
- Out: an install prompt of the portal's own (not planned); making individual tools work offline (each tool's concern, declared by its offline-capable flag).

## Requirements
- **R1** The portal can be installed through the browser's own install option where supported, and the installed portal opens in its own window with its name and icon.
- **R2** After one online visit, the portal works offline per NFR-06, including every tool address and the not-found state.
- **R3** While offline, the portal shows a quiet offline indicator (COPY-shell.offline). Linked tools, and embedded tools that are not offline-capable, are marked unavailable (COPY-tool.unavailable).
- **R4** When a new version of the portal has been published, a message offers to refresh (COPY-shell.updateReady, COPY-shell.refresh). It stays until the user refreshes. The portal never refreshes by itself.

## Acceptance criteria
- **AC1** Given a browser that supports installation, when the user installs the portal through it, then the portal opens in its own window with the TaroKit name and icon. (R1)
- **AC2** Given one previous online visit, when the device is offline and the user opens the catalog, then the catalog with all visible tools is shown. (R2)
- **AC3** Given one previous online visit, when the device is offline and the user opens the address of an embedded tool that is not offline-capable, then the tool view shows the offline state. (R2)
- **AC4** Given one previous online visit, when the device is offline and the user opens an unknown tool address, then the not-found state is shown. (R2)
- **AC5** Given the device is offline, when home is shown, then the offline indicator is visible, and linked tools and non-offline-capable tools are marked unavailable. (R3)
- **AC6** Given a new version is published while the portal is open, when the portal detects it, then the update message is shown and the page is not reloaded until the user chooses refresh. (R4)
- **AC7** Given the update message, when the user chooses refresh, then the new version loads with favorites, recents and theme intact. (R4)
- **AC8** Given one previous online visit, when the device is offline and the user opens the Media tools category address, then the category page with its visible tools is shown. (R2)

## UX notes
The indicator and update message live in CMP-AppShell. Unavailable cards use the CMP-ToolCard unavailable state. Tool-level offline behavior is in F-003 (SCR-ToolView). Not-found is SCR-NotFound.

## Edge cases
- The browser does not support installation. The portal still works as a website.
- An offline-capable embedded tool that the user has never opened online may still fail offline. That is the tool's concern.
