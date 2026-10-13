# Spike SP-5 registry-pipeline (2 h)

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-5.
- Time box: 2 h of agent work (about 1 h used).
- Not built: anything outside the spike's question. No production code under src/. The code lives on branch `spike/sp5` under `spikes/sp5/`.
- Note: this file replaces the empty stub `spike-.md`, whose name and time box were blank.

## SP-5 result

**Verdict: ADAPT.** The pipeline works as ADR-0002 and ADR-0005 describe, and every F-001 failure fixture fails the build with file:line › entry › rule. The adaptations are small: a schema hardening, two generator options, a per-page `frame-src`, and a re-split home JS budget line.

### Versions used (Node 24.19.0, pnpm 11.25.0)
astro 7.3.8, @astrojs/preact 6.0.6, preact 10.29.8, @preact/signals 2.11.3, typescript 6.0.3, yaml 2.9.1, ajv 8.20.0, ajv-formats 3.0.1, json-schema-to-typescript 16.0.0, and esbuild 0.28.2 (spike only, to bundle the standalone validator). Every pinned range in dependencies.md resolved, so nothing was substituted. Newer majors exist but are excluded by the pins: preact 11.0.1 and typescript 7.0.2. pnpm 11 refuses to build until esbuild's postinstall is allowed (`allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml`).

### 1. One registry feeds every consumer: PASS
`lib/content.ts` loads YAML, runs Ajv 2020 against `specs/10-domain/project.schema.json` (compiled in place), runs the TypeScript invariants, normalizes for RULE-07, and derives views. `astro.config.mjs` loads the registry first and builds CSP `frame-src` from `embeddedOrigins`. The pages consume it:

- the hashed `/data/catalog.<hash>.json`, which the palette island fetches;
- `/tools/`;
- `/t/[id]/`, through `getStaticPaths`;
- `/now/`, which holds the changelog;
- `sitemap.xml.ts`.

Results:

- **AC1/AC4:** adding `qr.yaml` alone (no other edit) put the tool in all six consumers. As an own tool with no `openMode`, it opened embedded, and its origin was added to `frame-src`.
- **AC6:** `grep -rlE "secret-lab|old-blog" dist` returns nothing.
- **Headless Chrome:** under Astro's CSP meta the palette hydrated, fetched the catalog and listed the 5 visible tools.

### 2. Failure fixtures (`node scripts/run-fixtures.ts`, each run is a real `pnpm build`)
| Fixture | Exit | Output (verbatim) |
|---|---|---|
| AC2 duplicate id | 1 | `content/tools/json-copy.yaml:2 › json › INV-01: duplicate id "json"; also used by content/tools/json.yaml` (and the mirror line) |
| AC3 http | 1 | `content/tools/base64.yaml:7 › base64 › INV-02: url "http://base64.tool.tarokit.dev/" is not a secure https address` |
| AC5 external+embedded | 1 | `content/tools/excalidraw.yaml:9 › excalidraw › RULE-07: an external tool cannot have openMode "embedded" (external tools are always linked; embedded tools must be own)` |
| AC7 unknown category | 1 | `content/tools/loan.yaml:6 › loan › F-001.R5: category "finance" does not exist in content/categories.yaml` |
| AC8 updated < added | 1 | `content/tools/json.yaml:11 › json › INV-06: updated 2026-01-02 is before added 2026-02-01` |
| Two errors at once | 1 | `Content validation failed with 2 error(s):`, then the INV-02 and INV-06 lines |
| INV-03 portal origin (extra) | 1 | `content/tools/self.yaml:7 › self-hosted › INV-03: embedded tool must not be served from the portal origin https://tarokit.dev` |

A failing build ends in about 0.8 s, because validation runs before Astro starts.

**Readability of `if`/`then` errors.** For AC5, raw Ajv returns 4 errors:
- `#/allOf/1/then/properties/origin/const must be equal to constant`
- `#/allOf/1/if must match "then" schema`
- the same pair for `#/allOf/2`

The mapper drops the `if` errors and collapses the rest into one RULE-07 line. The mapping depends on the positional `allOf/1|2` paths, which is brittle.

### 3. Measurements
- **Validation, 500 entries:** module import takes 46 ms. `loadRegistry` takes 95 ms cold (including the Ajv compile) and 40–52 ms warm. Target is under 2 s: **PASS**. A full build of 503 pages takes 0.5 s for page generation.
- **Standalone backup validator** (`$defs/backupFile`, esbuild-minified): 20.1 KB raw, **4.7 KB gzip** (4.1 KB brotli). Target is ≤ 8 KB: **PASS**. Registering only the `date` and `date-time` formats did not shrink it.
  - In Node it runs in a vm context with string code generation disabled.
  - In headless Chrome under Astro's CSP (no `unsafe-eval`) it printed `validator good=true bad=false evalBlocked=true`.
- **Home JS** (skeleton, palette island with `client:load`, gzip / brotli):
  - inline scripts (in the HTML): 1.98 / 1.74 KB;
  - `client.js`: 1.50 KB gzip;
  - preact: 4.41 KB gzip;
  - signals: 3.72 KB gzip (the budget assumed 2.5 KB);
  - palette: 0.63 KB gzip;
  - **total: 12.2 KB gzip / 11.1 KB brotli.**

  The architecture.md "runtime + Preact + signals ≤ 10 KB" line comes to 9.6 KB, or 11.6 KB if the inline island runtime is counted there instead of in the HTML budget.
- **Catalog data file at 500 entries:** 149.6 KB raw (about 299 B per entry, matching the estimate), 11.3 KB gzip.
- **Global `frame-src` at 500 tools:** 398 origins, which makes the CSP meta 16.4 KB on *every* page. Home HTML grows from 2.9 to 4.1 KB gzip (22.3 KB raw).
  - Per-page `Astro.csp.insertDirective("frame-src <origin>")` on `/t/[id]/` only, with no global `frame-src`, brings home back to 2.9 KB gzip.
  - Combining it with a global `frame-src 'none'` produces `frame-src 'none' https://…`, which is not usable.

### Surprises
1. **Unknown fields pass the schema silently.** A typo `opnMode: linked` builds green, and the tool silently becomes *embedded*. `unevaluatedProperties: false` on `tool` and `project` catches it (tested in memory) and still accepts valid entries.
2. **json-schema-to-typescript defaults are unusable as is:**
   - `Tool` and `Project` lose every `entryBase` field, because `allOf` is dropped when sibling `properties` exist. The spike composes `EntryBase & Tool` in code instead.
   - `maxItems` expands into tuple unions (`PersonalData` came out at about 900 lines).
   - `$defs/date` becomes `type Date`, which shadows the global `Date`.

   The fix is `maxItems: -1` plus `customName` (renaming it to `IsoDate`).
3. **No root def for `yaml-language-server` modelines.** The schema has no root and no `categoryList` def, so modelines can't point straight at it. The spike adds thin `$ref` wrapper schemas (`spikes/sp5/schemas/`) that restate nothing. They were not tried in an editor.
4. Astro warns that Shiki is incompatible with CSP. `markdown.syntaxHighlight: false` silences the warning.

### Proposed ADR and spec edits
- **ADR-0005:**
  - Add `unevaluatedProperties: false` to `$defs/tool` and `$defs/project` in `project.schema.json` (a spec change).
  - Tag the rule-bearing subschemas with `$comment: "RULE-07"` / `"INV-02"` so the error mapper reads rule IDs from the schema instead of positional paths.
  - Record the generator options (`maxItems: -1`, `customName`) and the fact that registry types compose `EntryBase & Tool`.
  - Add editor wrapper schemas, or a `categoryList` def.
  - Adopt the error line format `file:line › entry › rule: message` as the MOD-Content contract.
- **ADR-0002 / ADR-0009:** emit `frame-src` per page, only on `/t/<id>/`, with that tool's single origin. Other pages fall back to `default-src 'self'`. This keeps the CSP size flat as the catalog grows.
- **architecture.md budget:** signals is 3.7 KB gzip, not 2.5. Either count the inline island runtime under HTML (as now) or raise the runtime line to ≤ 12 KB.
- **dependencies.md:** add esbuild (build) for the standalone validator bundle, and note pnpm 11's `allowBuilds`.

### Evidence (on branch `spike/sp5`, `spikes/sp5/`)
- **Commands:**
  - `pnpm build`
  - `node scripts/run-fixtures.ts`
  - `node scripts/bench.ts`
  - `node --experimental-vm-modules scripts/build-backup-validator.ts`
  - `node scripts/measure-home.ts`
  - `node scripts/serve.ts` with `node scripts/chrome-check.ts`
  - `node scripts/try-unevaluated.ts`
- **Code:** the prototype is `lib/content.ts`, the fixtures are in `fixtures/`, and the generated types are in `src/generated/domain.ts`.
