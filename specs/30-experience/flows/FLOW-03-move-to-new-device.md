---
id: FLOW-03
title: Move personal data to a new device
status: draft
features: [F-013]
screens: [SCR-Settings]
---

## Goal
The Owner carries favorites, recents, theme and days used to another device.

## Diagram
```mermaid
flowchart LR
  A[Old device: Settings] -->|export| F[Backup file]
  F -->|import| B[New device: Settings]
  B --> C{Valid?}
  C -->|yes, confirm| D[Data replaced]
  C -->|no| E[Error, unchanged]
```

## Steps
1. On the old device, SCR-Settings → export (F-013.R1).
2. Move the file by any means the Owner chooses.
3. On the new device, SCR-Settings → import, then confirm (F-013.R2, F-013.R4).

## Exits & failures
- An invalid file leaves data unchanged (F-013.R2).
- Cancel leaves data unchanged (F-013.R4).
