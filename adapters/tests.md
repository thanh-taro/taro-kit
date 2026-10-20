# Tests adapter — Vitest + Playwright

How tests consume the specs. The stack and tools are decided in ADR-0006; this file only fixes the conventions that tooling relies on.

## Where tests live
| Kind | Runner | Folder | Runs against |
|---|---|---|---|
| Unit / integration (pure logic: content validation, codegen, search, rules, CSP derivation, catalog-check classifier) | Vitest, Node environment | `tests/unit/**/*.test.ts` | source modules directly |
| End-to-end, accessibility, privacy | Playwright (`chromium`, `firefox`, `webkit` projects) + `@axe-core/playwright` | `tests/e2e/**/*.spec.ts` | `astro preview` serving production builds of test content: `dist-samples/` (`pnpm build:samples`, the sample content in `tests/fixtures/content/samples/`, with the service worker) and `dist-fixtures/` (`pnpm build:fixtures`). Playwright builds both. |
| Fixtures | — | `tests/fixtures/<area>/<fixture-name>/` | — |

**No test reads `content/`.** It is the Owner's to replace; tests that need catalog content use fixtures. The unit suite checks only that whatever `content/` holds validates (`$TAROKIT_CONTENT_DIR` stands in for it when set). The production `pnpm build` and `dist/` are checked by the build guards (`check-dist-fonts`, `check-dist-clean`), not by e2e.

## Naming: acceptance-criterion IDs in test names
Every test that verifies an acceptance criterion starts its name with the **compact AC ID**: the feature ID without its hyphen, an underscore, then the AC.

| Spec ID | Compact form | Example test name |
|---|---|---|
| `F-001.AC2` | `F001_AC2` | `F001_AC2 fails on a duplicated id and names both entries and the id` |
| `F-005.AC6` | `F005_AC6` | `F005_AC6 drops the hidden favorite when pinning` |

Rules:
- `python3 tools/spec_lint.py --coverage tests/` scans every `.ts`/`.js` file under the folder for either the compact form (`F001_AC2`) or the full form (`F-001.AC2`). An AC counts as covered only if one of them appears, so **always put the compact ID in the test title**, not only in a comment.
- One AC may have several tests (one per engine-specific branch, edge case or fixture). One test may cite several ACs when it truly verifies all of them: `F003_AC1 F003_AC2 …`.
- A test that verifies a rule, invariant or NFR but no AC cites that ID instead (`RULE-07 opens an own tool…`, `INV-03 fails on…`, `NFR-05 …`). It does not count toward AC coverage, and it must not borrow an AC ID it does not fully verify.
- Fixtures that exist for one AC are named after it, `F001_AC7-unknown-category/`, so a failing fixture points straight at the spec.
- Never cite an AC whose feature is still `draft`; generate tests only from `ready` features or later.

## Commands
| Command | What it runs |
|---|---|
| `pnpm test` | Vitest, all unit tests |
| `pnpm test:e2e` | Playwright, every project (it builds `dist-samples/` and `dist-fixtures/` itself) |
| `pnpm exec playwright test --project=chromium` | the pull-request subset |
| `python3 tools/spec_lint.py --coverage tests/` | lists acceptance criteria without a test |

## Engine notes
- WebKit focuses links with Tab only when the "tab to links" preference is on; e2e tests press `Alt+Tab` on WebKit for link focus order.
- Playwright WebKit's offline emulation blocks requests before the service worker sees them; offline tests on WebKit stop the server instead (ADR-0006, SP-4).
- `astro preview` detaches into the background when it detects a coding agent; the Playwright web server runs it with `--ignore-lock` to keep it in the foreground.
