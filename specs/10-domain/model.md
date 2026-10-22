---
title: Domain model
status: draft
---

# Domain model

The machine-readable shape is in `10-domain/project.schema.json`. This file holds the meaning and the invariants.

## Content (authored by the Owner, published with the portal)

### ENT-CatalogEntry — Catalog entry
One item in the catalog. Its `kind` is `tool` (ENT-Tool).
Common fields:
- **id**: a unique, stable slug (INV-01).
- **name**, **summary** (one sentence).
- **icon**, an optional image bundled with the portal (never a remote address; NFR-05).
- **tags**: keywords used by search.
- **added**, an optional **updated** date (INV-06).
- **hidden** flag (RULE-06).

### ENT-Tool — Tool
A catalog entry of kind `tool`. Additional fields:
- **category** (ENT-Category).
- **address**: a secure web address (INV-02).
- **origin**: `own` (built by the Owner) or `external` (third party, always linked).
- **open mode**: `embedded` or `linked` (RULE-07, INV-03).
- **permission set**: the capabilities granted when embedded, default none (RULE-10).
- **offline-capable** flag, default false.
- **source address**, optional: where the tool's source code lives.

### ENT-Project — Project
**Deprecated (D-055):** removed with the projects showcase; the catalog no longer accepts entries of kind `project`. Kept for history. It had these fields:
- **description**: a short paragraph.
- **image**, optional, bundled with the portal: a PNG, JPEG, WebP, AVIF or SVG file.
- **links**: a list of label + address pairs, such as live site or source.
- **year**.

### ENT-Category — Category
A named group of tools. Every tool belongs to exactly one category (INV-07). Fields:
- **id** (slug), **name**, **display order**;
- **intro**: one or two sentences in Taro's first-person voice (PRN-04), shown on the category page;
- **icon**: a bundled icon;
- **tint**: one of the category tints (RULE-14).

M-1 categories (D-027), in display order:
1. **Developer tools** (`developer`, tint violet)
2. **Media tools** (`media`, tint mango)
3. **Converters & calculators** (`converters`, tint sky)
4. **Productivity & relax** (`productivity`, tint mint)

Categories with no visible tools are not shown (RULE-06).

### ENT-Profile — Profile
The Owner's identity:
- name (full name, e.g. Nguyen Tri Thanh), nickname (optional short name used by the portal's voice and brand, e.g. Taro), headline, a short bio (a few paragraphs);
- avatar (optional; initials are used when absent);
- location (optional);
- a list of links (label, address, kind: email, social, website, code host or other).

### ENT-Resume — Résumé
The Owner's optional career record, in the order the Owner writes it (RULE-15):
- experience: each with a role, an organization, a start month, an end month (none while it is current), a short summary and optional highlights;
- education: each with a program, an institution, an optional level, a start month, an optional end month and optional notes;
- skills: each with a name, an optional group (a short label in the Owner's words, such as "Languages") and an optional self-rated level from 1 to 5;
- languages: each with a name and a level, in words;
- certificates: each with a name, an issuer and a year;
- awards: each with a title, an issuer and a year.
The résumé lives in its own optional content file. Every section is optional; a résumé with no entries in any section counts as no résumé. Without a résumé, the portal has no Résumé page.

### ENT-NowNote — Now note
A single hand-written note: a body (a few paragraphs) and a **last updated** date (RULE-09).

### ENT-Policy — Policy
One of the portal's two required documents, the **privacy policy** and the **terms of use**, written by the Owner: a **title** (up to 60 characters), a **last updated** date, and one or more **sections**, each with a **heading** (up to 80 characters) and a **body** of one or more paragraphs. A paragraph is plain text that may hold links, each with visible text and an address (INV-02); a paragraph may instead be a simple bulleted list, each item plain text that may hold links. Each policy lives in its own content file. They cover the portal and, in general terms, the tools it lists; each tool states its own data handling inside the tool.

## Personal data (created by the user, stored only on the device)

### ENT-PersonalData — Personal data
The set of everything stored for the current user on this device: favorites (ENT-Favorite), recents (ENT-RecentVisit), preferences (ENT-Preferences) and days used (RULE-13). It never leaves the device except through a backup file the user exports (INV-05). It has a schema version used by import (RULE-08).

### ENT-Favorite — Favorite
A tool id plus the time it was pinned. The list is ordered by pin time (RULE-02).

### ENT-RecentVisit — Recent visit
A tool id plus the time it was last opened. There is at most one per tool (RULE-01).

### ENT-Preferences — Preferences
The theme: `system`, `light` or `dark` (RULE-03).

## Invariants
- **INV-01** Catalog entry ids are unique. They are lowercase slugs (letters, digits, hyphens), never change once published, and are never reused for a different entry.
- **INV-02** Every tool address, profile link and link in a policy (ENT-Policy) uses a secure web address (https), except email links.
- **INV-03** A tool whose open mode is `embedded` has origin `own` and is served from its own site address, never the portal's own address (otherwise it could not be isolated). Its permission set defaults to none (RULE-10) and its offline-capable flag defaults to false. A linked tool is never at the portal's own address either: that address belongs to the portal's own pages (and its offline worker).
- **INV-04** Favorites and recents may hold ids of tools that are unknown or hidden. Such entries are never shown to the user. They stay in storage until the RULE-01 or RULE-02 limits remove them, and while stored they reappear if the tool becomes visible again.
- **INV-05** Personal data is stored only on the user's device. The portal sends none of it over the network, with one exception: the theme currently showing (light or dark) is passed to an embedded tool's own address (F-012.R5, D-039).
- **INV-06** Every catalog entry has an `added` date. If it has an `updated` date, that date is on or after `added`.
- **INV-07** Every tool belongs to exactly one category, and that category exists. Category ids are unique, stable slugs, like entry ids (INV-01).
- **INV-08** In the résumé, an experience or education end month, when present, is on or after its start month.
