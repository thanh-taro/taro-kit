---
title: Roadmap
status: draft
---

# Roadmap

## M-1 — Portal and identity
The portal shell, catalog, tool view, palette, favorites, recents, home, About, Now and changelog, installable offline shell, theme, backup, catalog check and link previews, the résumé, the privacy policy and terms, and English and Vietnamese: F-001 to F-019, except the deprecated projects showcase (D-055). Quality bar: NFR-01, NFR-02, NFR-03, NFR-04, NFR-05, NFR-06, NFR-07, NFR-08, NFR-09, NFR-10, NFR-11, NFR-12.
**Done when:** every M-1 acceptance criterion passes, and the Owner's days-used count (RULE-13) shows at least 10 of the last 14 days.

## M-2 — Polish
Candidates, not yet specified:
- tool detail pages (screenshots, source, version);
- reordering favorites and per-favorite shortcuts;
- a visible "external" label on third-party tools (they can already be listed, as linked tools, in M-1);
- richer home widgets;
- a per-tool preview image.
- keep the offline copy small as the catalog grows: each tool page is precached separately (~35 KB each), projected at ~17 MB for 500 tools against SP-4's 5 MB bar; one shared tool page would fix it (QA perf audit, `perf-qa.md`).

## M-3 — Ecosystem
Candidates, not yet specified:
- a starter template for new tool projects;
- tools publishing their own catalog entry, collected when the portal is built;
- optional sync of personal data.
