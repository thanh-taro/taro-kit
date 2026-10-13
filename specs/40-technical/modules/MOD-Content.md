---
id: MOD-Content
title: Content and registry
status: draft
depends_on: []
---

## Responsibility
MOD-Content owns the authored content and turns it into the **registry**: the single validated, normalized model of the catalog, categories, profile and Now note, used by everything else.
- **Load:** reads `content/**/*.yaml`.
- **Validate:** checks the files against `specs/10-domain/project.schema.json` with Ajv, then runs the cross-entry checks that the schema can't express (ADR-0005).
- **Report:** collects every error with the file, entry and rule.
- **Normalize:** applies defaults (RULE-07, empty permissions, offline false) and drops hidden entries from every derived view (RULE-06).
- **Derive build-time views:**
  - visible tools by category;
  - categories that have visible tools;
  - projects sorted by year then name;
  - dated changelog events, with one added and one updated event per tool;
  - the site index entries;
  - the embedded-origin list.
- **Emit:** writes the hashed catalog data file (`/data/catalog.<hash>.json`) that islands fetch, carrying pre-normalized search keys.

It runs in Node at build and inside the catalog check. It never runs in the browser, except that its emitted JSON is read there.

## Not responsible for
- Anything relative to the viewer's date: what's new (RULE-04 window), the stale Now label (RULE-09). The browser computes these.
- Checking whether addresses are live (MOD-CatalogCheck).
- Rendering (MOD-Pages) and link-preview tags (MOD-Meta).
- Personal data (MOD-PersonalData).

## Public surface
- `loadRegistry(options) → Registry`, or a thrown `ContentErrors` holding `{ file, entryId, rule, message }[]`.
- The `Registry` type, with `visibleTools`, `toolById(id)`, `categories`, `projects`, `profile`, `now`, `changelogEvents`, `embeddedOrigins`, `portalOrigin` and `allTools` (for checks only).
- `emitCatalogData(registry) → { path, hash }`.
- Generated domain types: `src/generated/domain.ts`, which is the schema's TS mirror.
- A CLI, `pnpm content:validate`, used by the build and CI.

## Implements
F-001 (all requirements). It supplies the data behind F-002, F-003.R1, F-004, F-009, F-010.R3 and F-015.R3.
