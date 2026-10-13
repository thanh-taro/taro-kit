---
id: SCR-Now
title: Now and changelog
status: draft
features: [F-010]
components: [CMP-AppShell, CMP-StateMessage]
---

## Purpose
See what Taro is focused on and what's new in the toolkit.

## Layout regions
1. Shell header.
2. Now section: note body and last updated date (COPY-now.updated), plus the stale label when applicable (COPY-now.stale).
3. Changelog section (COPY-now.changelogTitle): month groups of "added" (COPY-now.changelogAdded) and "updated" (COPY-now.changelogUpdated) items linking to tools.

## States
| State | When | What the user sees |
|---|---|---|
| default | note and changelog | both sections |
| empty | no Now note | only the changelog; with no visible tools either, CMP-StateMessage with COPY-now.empty |
| loading | n/a | local content |
| error | n/a | — |

## Entry & exit
- Entered from: About, the palette, shell navigation.
- Exits to: SCR-ToolView.

## Accessibility
Dates are machine-readable and read in full.
