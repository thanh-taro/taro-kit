---
id: SCR-ToolView
title: Tool view
status: draft
features: [F-003, F-005, F-011, F-012]
components: [CMP-AppShell, CMP-ToolHeader, CMP-StateMessage]
---

## Purpose
Use one tool inside the portal, or get to it.

## Layout regions
1. Shell header, compact. On narrow screens the shell header is hidden in the tool view, and the tool header carries back, search (COPY-shell.search, opens the palette), favorite and open-in-new-tab as labeled icon buttons.
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
The embedded tool region has an accessible name of "<tool name> tool". Focus moves to the tool header on entry. A skip link jumps into the tool. Both targets show the focus ring when focused from the keyboard or on entry (NFR-04). The tool name in the header wraps on narrow screens rather than being cut off (NFR-07).
