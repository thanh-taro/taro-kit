---
id: F-014
title: Check the catalog before publishing
status: building
milestone: M-1
priority: P1
personas: [PER-01]
entities: [ENT-Tool, ENT-Project, ENT-Profile]
rules: [RULE-12]
screens: []
components: []
nfr: []
events: []
depends_on: [F-001]
---

## Intent
Dead links and tools that refuse to be embedded are caught before visitors meet them, so the Owner can trust the catalog without clicking through every tool (PRN-05).

## Scope
- In: an automated check before each publish and on a weekly schedule, covering reachability of tool, project and profile addresses and whether embedded tools allow the portal to embed them.
- Out: checking content inside tools; real-time uptime monitoring.

## Requirements
- **R1** Before publishing, the check verifies that every visible tool's address is reachable (RULE-12), and stops the publish if one is not.
- **R2** For every visible embedded tool, the check verifies that the tool's site allows the portal's site to embed it (RULE-12), and stops the publish if it does not.
- **R3** The check reports each failure with the entry id, the address and the reason, and reports a pass with the number of entries checked.
- **R4** The check verifies that visible project links and profile links are reachable, and reports failures as warnings that do not block publishing.
- **R5** The check also runs weekly against the published catalog. A failure marks that run as failed and notifies the Owner through the same channel as a failed publish, without changing the live portal.

## Acceptance criteria
- **AC1** Given a visible tool whose address answers "not found", when the check runs, then it fails and names the entry, the address and the status. (R1, R3)
- **AC2** Given a visible tool whose address doesn't answer within 10 seconds, even after one retry, when the check runs, then it fails with a timeout reason. (R1, R3)
- **AC3** Given a hidden tool with a dead address, when the check runs, then that entry is skipped. (R1)
- **AC4** Given an embedded tool whose site declares no embedding restriction, when the check runs, then that entry passes. (R2)
- **AC5** Given an embedded tool whose site allows embedding only by itself, when the check runs, then it fails and names the entry and the reason. (R2, R3)
- **AC6** Given an embedded tool whose site explicitly allows the portal's site, when the check runs, then that entry passes. (R2)
- **AC7** Given all tools reachable and embeddable, when the check runs, then it passes and reports how many entries it checked. (R3)
- **AC8** Given a project with a dead link, when the check runs, then it reports a warning naming the project and the link, and publishing continues. (R4)
- **AC9** Given a tool that has gone down since publishing, when the weekly run happens, then the run is marked failed, the Owner is notified, and the live portal is unchanged. (R5)
- **AC10** Given a profile link that answers "not found", when the check runs, then a warning names the link, and publishing continues. (R4)

## UX notes
No portal interface. Output appears wherever the Owner's publishing checks report.

## Edge cases
- A tool that is down temporarily blocks publishing. The Owner can hide it or retry.
- An address that redirects to an address that isn't secure (INV-02), or to something that isn't a web address, counts as unreachable: a tool fails, a project or profile link gets a warning.
