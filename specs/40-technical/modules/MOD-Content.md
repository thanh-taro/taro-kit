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
- `catalogData(registry) → { categories, tools, projects }`: the catalog data file's payload (visible entries only), read by the catalog, search and the palette.
- `emitCatalogData(registry) → { path, hash }`, which adds MOD-Search's pre-normalized keys to that payload and writes the hashed file (with F-002 and F-004).
- Pure derivations (`derive.ts`), used at build by pages, the site index and the catalog data. Each takes normalized entries and drops hidden ones itself (RULE-06):
  - `visibleTools(tools)`: visible tools, alphabetically (F-002.R1);
  - `visibleCategories(categories, tools)`: categories with at least one visible tool, in display order;
  - `toolsByCategory(tools, categoryId)`: one category's visible tools, alphabetically (F-016.R3);
  - `changelogItems(tools)` and `changelog(tools)`: RULE-04 changelog items (one added and one updated per tool, newest first), and the same grouped by month (F-010.R3);
  - `sitemapEntries({ categories, allTools })`: site index paths, being the public pages, visible category pages and visible tool addresses (F-015.R3);
  - `toolPath(id)` (`/t/<id>/`, F-003.R1), `categoryPath(id)` (`/tools/<id>/`, F-016.R1) and `PUBLIC_PAGES`.
  - Ties on the same date are ordered by name, then updated before added.
- Generated domain types: `src/generated/domain.ts`, which is the schema's TS mirror.
- A CLI, `pnpm content:validate`, used by the build and CI.

## Implements
F-001 (all requirements). It supplies the data behind F-002, F-003.R1, F-004, F-009, F-010.R3 and F-015.R3.
