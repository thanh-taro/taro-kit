---
id: F-004
title: Search with the command palette
status: building
milestone: M-1
priority: P0
personas: [PER-01]
entities: [ENT-Tool, ENT-Project]
rules: [RULE-01, RULE-03, RULE-05, RULE-06]
screens: []
components: [CMP-CommandPalette]
nfr: [NFR-02, NFR-04]
events: []
depends_on: [F-001, F-003, F-009]
---

## Intent
One keystroke from anywhere in the portal finds and opens any tool, project, page or action. This is the main way the Owner moves around (PRN-02).

## Scope
- In: summoning and dismissing the palette, searching tools, projects, pages and actions, keyboard navigation, running the chosen result.
- Out: searching inside tools; pinning from the palette (favorites are pinned from cards and the tool view, F-005).

## Requirements
- **R1** The palette opens from anywhere in the portal with the Mod+K shortcut (Command on Apple keyboards, Control elsewhere) and from a visible search control. It closes with Escape or a click outside, and focus returns to where it was.
- **R2** With an empty query, the palette shows the Favorites (at most 8, in pin order), Recents and Pages groups, in that order. Recents follow RULE-01: at most 8, with favorites left out. Pages are the navigation destinations Home, Tools, Projects, About, Now and Settings (COPY-nav.home, COPY-nav.tools, COPY-nav.projects, COPY-nav.about, COPY-nav.now, COPY-nav.settings).
- **R3** Typing searches visible tools, projects, pages and actions by RULE-05, showing the groups Tools, Projects, Pages and Actions in that order, each with at most 8 results.
- **R4** Results can be moved through across groups and run entirely from the keyboard. Running a tool opens it as in F-003. Running a page goes to it. Running a project goes to that project's address on the projects page (F-009.R4). Running an action performs it. Running anything closes the palette, except copy-address, which first shows its confirmation and then closes.
- **R5** Available actions: toggle the theme (RULE-03), export personal data (F-013), and copy the current page's address with confirmation (COPY-palette.copied).
- **R6** When nothing matches, the palette says so and offers to browse the catalog (COPY-palette.noResults, COPY-palette.browseAll).

## Acceptance criteria
- **AC1** Given any portal page, when the user presses Mod+K, then the palette opens with the search field focused. (R1)
- **AC2** Given the palette is open, when the user presses Escape, then it closes and focus returns to the element focused before. (R1)
- **AC3** Given favorites A and B, and recents B, C and D, when the palette opens with an empty query, then it shows Favorites A and B, then Recents C and D, then Pages. (R2)
- **AC4** Given a tool "Unit Converter" and a project "Unity Game", when the user types "uni", then the tool appears under Tools before the project under Projects. (R3)
- **AC5** Given the query "uni" shows one tool and one project, when the user presses Down once and then Enter, then the project's address on the projects page opens and its card is focused. (R4)
- **AC6** Given the light theme is showing, when the user runs the toggle-theme action, then the dark theme is showing and the palette closes. (R5)
- **AC7** Given the user runs the export action, when it completes, then a backup file is saved as in F-013. (R5)
- **AC8** Given the user runs copy-address on a tool view, when it completes, then the tool's portal address is on the clipboard and the copied confirmation is shown. (R5)
- **AC9** Given the query "zzzz", when results update, then the no-results message with a browse-catalog action is shown. (R6)

## UX notes
CMP-CommandPalette. Action names: COPY-palette.actionTheme, COPY-palette.actionExport, COPY-palette.actionCopy. The shortcut is shown in the search control and placeholder (COPY-palette.placeholder). Speed and keyboard targets are NFR-02 and NFR-04.

## Edge cases
- The shortcut is pressed while focus is inside an embedded tool. The tool keeps the keystroke; the visible search control in the portal header still opens the palette.
- Hidden entries never appear (RULE-06).
- The export action fails (its code can't load, or saving fails). The palette stays open and says so (COPY-palette.exportFailed).
- Keys pressed before the palette is ready (text, Enter) are kept: the Enter runs the chosen result once the search data has loaded.
- The search data can't load. Pages and actions still show and run, tools and projects are left out, and the palette says so (COPY-palette.unavailable).
