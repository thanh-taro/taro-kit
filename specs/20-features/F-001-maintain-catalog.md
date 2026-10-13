---
id: F-001
title: Maintain the catalog
status: ready
milestone: M-1
priority: P0
personas: [PER-01]
entities: [ENT-CatalogEntry, ENT-Tool, ENT-Project, ENT-Category]
rules: [RULE-06, RULE-07]
screens: []
components: []
nfr: []
events: []
depends_on: []
---

## Intent
The Owner adds a new tool or project by writing one catalog entry, and every part of the portal picks it up: catalog, search, home, changelog, tool view and site index (PRN-01). Mistakes are caught before publishing, not by visitors.

## Scope
- In: authoring catalog entries, categories, profile and Now note as content kept with the portal; validating them when the portal is built; hidden entries.
- Out: checking live addresses (F-014); not-found behavior for hidden tools (F-003); an in-app editor or admin screen (not planned).

## Requirements
- **R1** The Owner can add, change or hide a tool or project by editing its catalog entry, and add or change a category by editing the category list, with no other change needed for it to appear everywhere it belongs.
- **R2** Building the portal fails, naming the file, the entry and the broken rule, when any content breaks the data schema or INV-01, INV-02, INV-03 or INV-06.
- **R3** An own tool with no open mode opens embedded. An external tool declared as embedded is a build error (RULE-07).
- **R4** Hidden entries are left out of the catalog, search, palette, home, changelog, projects showcase and site index (RULE-06).
- **R5** A tool whose category does not exist is a build error.

## Acceptance criteria
- **AC1** Given a valid new tool entry with today's date as `added`, when the portal is built, then the tool appears in the catalog, search, palette, home "what's new", changelog and site index, and has a tool view, with no other edits. (R1)
- **AC2** Given two entries with the same id, when the portal is built, then the build fails and names both entries and the duplicated id. (R2)
- **AC3** Given a tool whose address is not secure, when the portal is built, then the build fails and names the entry. (R2)
- **AC4** Given an own tool with no open mode, when the portal is built, then it opens embedded. (R3)
- **AC5** Given an external tool declared as embedded, when the portal is built, then the build fails and names the entry. (R3)
- **AC6** Given a hidden tool and a hidden project, when the catalog, search, palette, home, changelog, projects showcase and site index are shown, then neither entry appears in any of them. (R4)
- **AC7** Given a tool whose category id does not exist, when the portal is built, then the build fails and names the entry and the category. (R5)
- **AC8** Given an entry whose updated date is before its added date, when the portal is built, then the build fails and names the entry. (R2)

## UX notes
No user interface. The Owner works with content files.

## Edge cases
- Changing an entry's id breaks favorites and links (INV-01). The build cannot detect this, so the authoring guide warns against it.
- An empty catalog builds successfully; home and catalog show their empty states.
- A category with no visible tools disappears (RULE-06).
