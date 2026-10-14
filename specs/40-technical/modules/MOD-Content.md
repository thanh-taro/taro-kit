---
id: MOD-Content
title: Content and registry
status: draft
depends_on: []
---

## Responsibility
MOD-Content owns the authored content and turns it into the **registry**: the single validated, normalized model of the catalog, categories, profile and Now note, used by everything else.
- **Load:** reads `content/**/*.yaml`. `now.yaml` is optional: without it there is no Now note and `now` is undefined (F-010.R4).
- **Validate:** checks the files against `specs/10-domain/project.schema.json` with Ajv, then runs the cross-entry checks that the schema can't express (ADR-0005).
- **Report:** collects every error with the file, entry and rule.
- **Normalize:** applies defaults (RULE-07, empty permissions, offline false) and drops hidden entries from every derived view (RULE-06).
- **Derive build-time views:**
  - visible tools by category;
  - categories that have visible tools;
  - projects sorted by year then name;
  - dated changelog events, with one added and one updated event per tool (only the added event when both are the same day, F-010);
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
  - `visibleProjects(projects)`: visible projects, newest year first, then by name (F-009.R1), the order of `Registry.projects`;
  - `changelogItems(tools)` and `changelog(tools)`: RULE-04 changelog items (one added and one updated per tool, newest first; a tool added and updated the same day has only the added item, F-010 edge case), and the same grouped by month (F-010.R3);
  - `sitemapEntries({ categories, allTools })`: site index paths, being the public pages, visible category pages and visible tool addresses (F-015.R3);
  - `toolPath(id)` (`/t/<id>/`, F-003.R1), `categoryPath(id)` (`/tools/<id>/`, F-016.R1), `projectPath(id)` (`/projects/#<id>`, F-009.R4) and `PUBLIC_PAGES`.
  - `initials(name)`, `paragraphs(text)` and `profileLinks(links)` (`profile.ts`): the profile as SCR-About shows it (F-008): the initials of the full name, the bio split at blank lines, and each link with its kind (email for `mailto:` addresses), whether it opens in a new tab (web links) and a short destination (host and path, or the email address).
  - Ties on the same date are ordered by name, then updated before added.
- `resolveAsset(path, site, errors)`: validates one bundled asset path for any asset field (inside `content/assets/`, one of the allowed extensions when given, present) and returns its absolute file, or adds one `ASSET` error naming the file, entry and field; `assetFile(contentDir, path)`: the file, or none when the path would leave `content/assets/`; `IMAGE_TYPES` and `imageType(path)`: the project image types by extension (PNG, JPEG, WebP, AVIF, SVG), the one table behind validation and the image route (F-009.R2).
- Generated domain types: `src/generated/domain.ts`, which is the schema's TS mirror.
- `visibleToolIdsPlugin(ids)`: a Vite plugin (registered in `astro.config.ts`) serving the build-time module `virtual:tarokit/visible-tool-ids` (`visibleToolIds`, the visible tools' ids, RULE-06). Islands import it for RULE-02 and INV-04 without a fetch or per-page props (F-005).
- `avatarPlugin()`: a Vite plugin serving `virtual:tarokit/avatar`, whose default export is the profile avatar imported from `content/assets/` (so Astro's image pipeline optimizes it, DEP-31), or `null` when the profile has none (F-008.R1). The registry checks that the avatar file exists (ADR-0005).
- A CLI, `pnpm content:validate`, used by the build and CI.

## Implements
F-001 (all requirements). It supplies the data behind F-002, F-003.R1, F-004, F-009, F-010.R3 and F-015.R3.
