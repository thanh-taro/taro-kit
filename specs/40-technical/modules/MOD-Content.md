---
id: MOD-Content
title: Content and registry
status: draft
depends_on: []
---

## Responsibility
MOD-Content owns the authored content and turns it into the **registry**: the single validated, normalized model of the catalog, categories, profile, Now note and résumé, used by everything else.
- **Load:** reads `content/**/*.yaml`. `now.yaml` is optional: without it there is no Now note and `now` is undefined (F-010.R4). `resume.yaml` is optional too: without it, or when it has no entries in any section (an empty file included), there is no résumé and `resume` is undefined (ENT-Resume, F-017.R4). It is checked against `$defs/resume`, then INV-08; its errors name the entry as `<section> <n>`, counting from 1, and the field inside it (`content/resume.yaml:12 › experience 3 › INV-08: end 2020-01 is before start 2021-03`, F-017.R5).
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
- The `Registry` type, with `visibleTools`, `toolById(id)`, `categories`, `projects`, `profile`, `avatarFile` (the validated avatar file, F-008.R1), `now`, `resume` (ENT-Resume, or undefined, F-017.R4), `changelogEvents`, `embeddedOrigins`, `portalOrigin` and `allTools` (for checks only).
- `catalogData(registry) → { categories, tools, projects }`: the catalog data file's payload (visible entries only), read by the catalog, search and the palette.
- `catalogDataFile(registry) → { path, hash, json }` (`emit-catalog-data.ts`, Node): that payload with MOD-Search's `searchKeys` on every tool and project, its address `/data/catalog.<hash>.json` (the first 10 hex digits of its SHA-256) and its JSON. Pages pass `path` to islands. `emitCatalogData(registry, outDir) → { path, hash }` writes it into the build output (an `astro:build:done` hook in `astro.config.ts`), and `catalogDataPlugin(registry)` serves it in dev. Because the file is written in `astro:build:done`, after Vite's output, the offline precache (F-011, MOD-Offline) must be generated after that step so it includes the file.
- Pure derivations (`derive.ts`), used at build by pages, the site index and the catalog data. Each takes normalized entries and drops hidden ones itself (RULE-06):
  - `visibleTools(tools)`: visible tools, alphabetically (F-002.R1);
  - `visibleCategories(categories, tools)`: categories with at least one visible tool, in display order;
  - `toolsByCategory(tools, categoryId)`: one category's visible tools, alphabetically (F-016.R3);
  - `visibleProjects(projects)`: visible projects, newest year first, then by name (F-009.R1), the order of `Registry.projects`;
  - `changelogItems(tools)` and `changelog(tools)`: RULE-04 changelog items (one added and one updated per tool, newest first; a tool added and updated the same day has only the added item, F-010 edge case), and the same grouped by month (F-010.R3);
  - `sitemapEntries({ categories, allTools, resume })`: site index paths, being the public pages (with `/resume/` after `/about/` when there is a résumé, F-017.R6), visible category pages and visible tool addresses (F-015.R3);
  - `toolPath(id)` (`/t/<id>/`, F-003.R1), `categoryPath(id)` (`/tools/<id>/`, F-016.R1), `projectPath(id)` (`/projects/#<id>`, F-009.R4) and `PUBLIC_PAGES`.
  - `initials(name)`, `paragraphs(text)` and `profileLinks(links)` (`profile.ts`): the profile as SCR-About shows it (F-008): the initials of the full name, the bio split at blank lines, and each link with its kind (email for `mailto:` addresses), whether it opens in a new tab (web links) and a short destination (host and path, or the email address).
  - Ties on the same date are ordered by name, then updated before added.
  - `resume.ts` (ENT-Resume, F-017): `RESUME_PATH` (`/resume/`), `RESUME_SECTIONS` (RULE-15 order), `hasResumeEntries(resume)` (a résumé with no entries counts as none), `resumeEntryName(section, index)` (`experience 3`, F-017.R5) and `resumePeriodErrors(resume)` (INV-08: an experience or education end month before its start month; an end later than today is allowed).
- `resolveAsset(path, site, errors)`: validates one bundled asset path for any asset field (inside `content/assets/`, one of the allowed extensions when given, present) and returns its absolute file, or adds one `ASSET` error naming the file, entry and field; `assetFile(contentDir, path)`: the file, or none when the path would leave `content/assets/`; `IMAGE_TYPES` and `imageType(path)`: the project image types by extension (PNG, JPEG, WebP, AVIF, SVG), the one table behind validation and the image route (F-009.R2).
- Generated domain types: `src/generated/domain.ts`, which is the schema's TS mirror.
- `visibleToolIdsPlugin(ids)`: a Vite plugin (registered in `astro.config.ts`) serving the build-time module `virtual:tarokit/visible-tool-ids` (`visibleToolIds`, the visible tools' ids, RULE-06). Islands import it for RULE-02 and INV-04 without a fetch or per-page props (F-005).
- `avatarPlugin()`: a Vite plugin serving `virtual:tarokit/avatar`, whose default export is the profile avatar imported from `content/assets/` (so Astro's image pipeline optimizes it, DEP-31), or `null` when the profile has none (F-008.R1). It imports the registry's `avatarFile`, the one path `resolveAsset` validated: inside `content/assets/`, present, and a raster image (`AVATAR_TYPES`: PNG, JPEG, WebP, AVIF; no SVG). Anything else is an `ASSET` build error naming `profile.yaml` and the avatar field.
- A CLI, `pnpm content:validate`, used by the build and CI.

## Implements
F-001 (all requirements) and F-017.R5. It supplies the data behind F-002, F-003.R1, F-004, F-009, F-010.R3, F-015.R3 and F-017.
