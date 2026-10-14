---
id: ADR-0005
title: Content as YAML files, validated at build by the domain JSON Schema, with generated types
status: proposed
date: 2026-10-13
supersedes: []
---

## Context
The Owner authors catalog entries, categories, the profile and the Now note as files in the repo (F-001, D-007). The build must fail and name the file, the entry and the broken rule when content breaks the schema or INV-01, INV-02, INV-03, INV-06, INV-07, RULE-07, RULE-14 or a category reference (F-001.R2, F-001.R3, F-001.R5).

The data shape already exists as JSON Schema 2020-12 in `specs/10-domain/project.schema.json`. The rule "one fact, one place" (specs/README.md) means code must not restate it in a second schema language. The same schema also describes backup files, which are validated in the browser at import (RULE-08).

## Decision
- **Content layout** (repo root):
  - `content/tools/<id>.yaml` and `content/projects/<id>.yaml`, one entry per file, so errors name the file;
  - `content/categories.yaml`, `content/profile.yaml` and `content/now.yaml`;
  - `content/assets/` for icons, images and the avatar.
- Each YAML file starts with a `yaml-language-server` schema comment, so editors validate and autocomplete while the Owner types.
- Long text (bio, Now body, descriptions) uses YAML block scalars. Paragraphs are separated by blank lines, and no Markdown engine is needed.
- **Parsing:** `yaml` (ISC).
- **Validation:** **Ajv 8** (MIT) in 2020-12 mode, plus `ajv-formats` (MIT) for real date and URI checks. Ajv compiles the canonical schema file in place. A second pass in TypeScript checks what the schema cannot express:
  - unique ids across tools and projects (INV-01);
  - `updated` on or after `added` (INV-06);
  - the category exists (F-001.R5);
  - open-mode defaults (RULE-07);
  - that asset paths exist;
  - and, proposed, that an embedded tool's origin differs from the portal's origin (ADR-0009).

  Errors are reported as `content/tools/json.yaml › json › INV-06: updated 2026-01-02 is before added 2026-02-01`. All errors are collected, not only the first.
- **Types:** `json-schema-to-typescript` (MIT, dev only) generates `src/generated/domain.ts` from the schema. A CI step fails if the generated file is stale.
- **Runtime validator:** Ajv **standalone code generation** emits a small validator for `backupFile` only, which MOD-Backup lazy-loads in settings. The Ajv compiler never ships to the browser.
- The validated, normalized result is the **registry** (MOD-Content). It is the only input for every page, the catalog data file, the site index, CSP derivation and the catalog check. Spike SP-5 proves that.

## Alternatives considered
- **Astro content collections with Zod schemas.** Ergonomic and cached, but they restate the domain schema in Zod, giving it two homes, and they tie validation to Astro. The catalog check (F-014) must also run outside the site build.
- **Zod 4, Valibot or TypeBox as the source, generating JSON Schema.** This inverts the source of truth and moves it out of `specs/`.
- **TypeScript content files using `satisfies`.** Editor typing is excellent, but types vanish at runtime. Cross-entry invariants still need code, and error messages can't name the broken rule in domain terms.
- **JSON content files.** Strict and simple, but painful for multi-paragraph text and gives no comments for the Owner.

## Consequences
- Adding a tool is one new YAML file (F-001.R1). Everything downstream is derived.
- A schema change in `specs/10-domain` regenerates the types. Type errors then show every consumer that must change.
- `json-schema-to-typescript` ignores `if`/`then`, so the generated types are looser than the schema for RULE-07. The registry's normalized types (in code) are strict.
- The authoring guide warns that ids never change (INV-01), because the build cannot detect a rename.

## Amendments from spike SP-5 (2026-10-13, ADR still proposed)
- The domain schema sets `unevaluatedProperties: false` on tool and project, so a typo such as `opnMode` fails the build instead of silently defaulting.
- Rule-bearing subschemas carry a `$comment` with their rule ID, so error messages don't depend on positional paths like `allOf/1`.
- Type generation uses json-schema-to-typescript with `maxItems: -1` and `customName`; code composes `EntryBase & Tool`; the generated `Date` alias is renamed to avoid shadowing the built-in.
- MOD-Content's error contract is `file:line › entry › rule: message`, one line per error, all errors reported at once.
- Measured: validating 500 entries takes 95 ms cold; the browser-side backup validator is 4.7 KB gzip and runs under strict CSP with no eval.

## Note from the scaffold (2026-10-14)
- The `$comment` rule tags are not in `project.schema.json` yet, so the validator maps RULE-07 by schema position. Adding the tags is part of building F-001; the error contract is unchanged.
