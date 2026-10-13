---
id: F-012
title: Choose a theme
status: ready
milestone: M-1
priority: P1
personas: [PER-01, PER-02]
entities: [ENT-Preferences]
rules: [RULE-03]
screens: [SCR-Settings, SCR-ToolView]
components: [CMP-AppShell]
nfr: [NFR-03]
events: []
depends_on: []
---

## Intent
The portal looks right in light and dark, and the Owner can override the system choice (PRN-04).

## Scope
- In: the system, light and dark themes; choosing in settings; a quick toggle in the shell header and the palette; remembering the choice; telling an embedded tool which theme is showing.
- Out: custom accent colors; sharing anything else with tools (tools stay independent, PRN-01).

## Requirements
- **R1** The theme is system, light or dark, and defaults to system, which follows the device setting live (RULE-03).
- **R2** Settings offers all three choices (COPY-settings.theme). The change applies immediately, with no reload.
- **R3** The quick toggle in the shell header and the palette's theme action switch to the opposite of the theme currently showing, and store that choice (RULE-03, COPY-shell.themeToggle).
- **R4** The chosen theme persists on the device, and the page never shows the wrong theme while loading.
- **R5** When the portal shows an embedded tool, it tells the tool the theme currently showing (light or dark, never "system") as it opens the tool, and again whenever the theme showing changes, so the tool can match it without reloading. Only this one value is shared, and only with that tool's own address (scheme, host and port).
- **R6** When an embedded tool says it is ready, the portal answers with the theme currently showing; messages from any other address are ignored.

## Acceptance criteria
- **AC1** Given theme system and a dark device setting, when the portal opens, then it is dark; when the device switches to light, then the portal switches too. (R1)
- **AC2** Given theme light, when the user picks dark in settings, then the portal turns dark immediately. (R2)
- **AC3** Given theme system with the dark theme showing, when the user activates the header toggle, then the light theme shows and the stored choice is light. (R3)
- **AC4** Given dark was chosen, when the portal reloads, then the first painted screen is already dark. (R4)
- **AC5** Given the dark theme is showing, when an embedded tool opens, then the tool's address carries the dark theme. (R5)
- **AC6** Given an embedded tool is showing, when the user toggles the theme, then the tool receives the new theme without reloading and nothing else is sent to it. (R5)
- **AC7** Given an embedded tool is loading, when it says it is ready, then the portal sends it the theme currently showing; when the same message comes from a different tool's address, then the portal sends nothing. (R6)

## UX notes
The quick toggle lives in CMP-AppShell; the full choice is in SCR-Settings. Telling tools the theme happens in SCR-ToolView and has no visible UI. The palette action is F-004.R5. Both themes meet the contrast targets of NFR-03.

## Edge cases
- Device storage is unavailable. The theme follows the system, and any choice lasts only for the session.
