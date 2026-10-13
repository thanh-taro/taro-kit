---
id: SCR-ToolView
title: Tool view
status: draft
features: [F-003, F-005, F-011]
components: [CMP-AppShell, CMP-ToolHeader, CMP-StateMessage]
---

## Purpose
Use one tool inside the portal, or get to it.

## Layout regions
1. Shell header, compact.
2. CMP-ToolHeader: tool name, favorite toggle, open-in-new-tab.
3. Tool area: the embedded tool fills the remaining space.

## States
| State | When | What the user sees |
|---|---|---|
| default | embedded tool loaded | the tool |
| loading | embedded tool loading | progress with COPY-tool.loading; after the slow-load threshold, CMP-ToolHeader switches to its slow variant |
| offline | offline, and the tool is not offline-capable | CMP-StateMessage with COPY-tool.offline |
| linked | tool's open mode is linked | CMP-StateMessage with COPY-tool.linkedNote and the open link |
| error | unknown or hidden id | SCR-NotFound content at the same address |

## Entry & exit
- Entered from: tool cards, the palette, a direct address, FLOW-01.
- Exits to: the tool's own address in a new tab; back.

## Accessibility
The embedded tool region has an accessible name of "<tool name> tool". Focus moves to the tool header on entry. A skip link jumps into the tool.
