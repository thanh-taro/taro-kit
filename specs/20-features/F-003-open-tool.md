---
id: F-003
title: Open a tool
status: ready
milestone: M-1
priority: P0
personas: [PER-01, PER-02]
entities: [ENT-Tool]
rules: [RULE-06, RULE-10, RULE-11]
screens: [SCR-ToolView, SCR-NotFound]
components: [CMP-ToolHeader, CMP-StateMessage]
nfr: [NFR-08]
events: []
depends_on: [F-001]
---

## Intent
Every tool has a stable address in the portal. Opening it either shows the tool inside the portal, isolated from it, or sends the user to the tool's own address. A blank or broken view is never shown (PRN-01, PRN-05).

## Scope
- In: the tool view for embedded tools, opening linked tools, the per-tool address, the loading, slow, offline and not-found states.
- Out: recording recents (F-006), favoriting (F-005), offline availability of the portal itself (F-011).

## Requirements
- **R1** Every visible tool has a stable portal address built from its id. Visiting the address of an embedded tool shows that tool.
- **R2** An embedded tool is shown inside the tool view with a header giving its name, a favorite toggle, and an always-visible action to open the tool at its own address in a new tab.
- **R3** An embedded tool can use only the capabilities in its permission set. It can never read or change the portal's content or personal data, never navigate the portal page, and cannot navigate its area to an address outside its own site (RULE-10).
- **R4** Opening a linked tool from a card or the palette opens its own address in a new tab, and the portal stays where it was. Visiting a linked tool's portal address directly opens nothing automatically; the tool view shows a note with a link to open it (COPY-tool.linkedNote).
- **R5** While an embedded tool loads, a loading state is shown (COPY-tool.loading). After the slow-load threshold (RULE-11), a hint suggests opening it in a new tab (COPY-tool.slow) and the tool keeps loading.
- **R6** When the device is offline and the tool is not offline-capable, the tool view shows an offline state instead of the tool (COPY-tool.offline). When the connection returns, the tool loads with no manual reload.
- **R7** An unknown or hidden tool id shows the not-found state with a link back to the catalog (RULE-06).
- **R8** In a browser, an own embedded tool sees the same data of its own whether it is opened inside the portal or at its own address (ADR-0001; AC11 cannot pass until spike SP-1 confirms it). The installed portal on platforms that keep the installed app's storage separate is exempt.

## Acceptance criteria
- **AC1** Given an embedded tool "json", when the user visits its portal address, then the tool is shown inside the tool view under its header. (R1, R2)
- **AC2** Given an embedded tool is shown, when the user chooses open-in-new-tab, then the tool's own address opens in a new tab. (R2)
- **AC3** Given an embedded tool with no permissions, when it tries to write to the clipboard, then the attempt is refused and the portal is unaffected. (R3)
- **AC4** Given an embedded tool, when it tries to read the portal's stored personal data, then it receives nothing. (R3)
- **AC5** Given an embedded tool, when it tries to navigate its area to an address on another site, then the navigation is blocked and the portal page stays the same. (R3)
- **AC6** Given a linked tool, when the user opens it from the catalog, then its own address opens in a new tab and the portal stays where it was. (R4)
- **AC7** Given a linked tool, when the user visits its portal address directly, then nothing opens automatically and the note with a link is shown. (R4)
- **AC8** Given an embedded tool that has not loaded after the slow-load threshold, when the threshold passes, then the slow hint with open-in-new-tab is shown and the tool keeps loading. (R5)
- **AC9** Given the device is offline and the tool is not offline-capable, when the user opens it, then the offline state is shown; when the connection returns, the tool loads without a manual reload. (R6)
- **AC10** Given the id "does-not-exist", when the user visits its portal address, then the not-found state is shown with a link to the catalog. (R7)
- **AC11** Given an own embedded tool saved a value while open at its own address, when the user opens the same tool inside the portal, then the tool shows that value. (R8)

## UX notes
SCR-ToolView with CMP-ToolHeader. States use CMP-StateMessage. Not-found is SCR-NotFound (COPY-notFound.title, COPY-notFound.body, COPY-notFound.toCatalog). Isolation is a security requirement (NFR-08).

## Edge cases
- The tool's site refuses to be embedded. The portal can't reliably detect this, so the always-visible open-in-new-tab action is the fallback, and F-014 prevents it before publishing.
- The browser blocks the new tab for a linked tool. The user can still open the tool from its portal address, which shows the linked note (R4).
