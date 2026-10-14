# Build plan: M-1 (phase 4)

16 ready features: 85 requirements, 141 acceptance criteria. Each feature goes through the same pipeline:
1. a `feature-builder` agent loads the spec context and the matching design boards;
2. it writes one test per AC first (named `F0xx_ACn`, adapters/tests.md);
3. it implements the feature;
4. it builds, tests and runs the app, with screenshots compared against design/canvas;
5. a code review, a spec audit (`spec_lint --coverage`), and a security audit where the feature touches data, network or embedding;
6. fixes, then the merge.

Waves run up to 3 features in parallel, in separate worktrees. Merges happen one at a time, with the full suite run after each.

| Wave | Features | Why together |
|---|---|---|
| 1 · Foundations | **F-001** catalog (finish: `$comment` rule tags, every AC tested) · **F-012** theme incl. the R5/R6 hand-off · **Shell** (CMP-AppShell narrow menu, offline and update slots, search entry, ADR-0010 personal-data store) | Everything else builds on these |
| 2 · Core pages | **F-016** category pages · **F-003** tool view (embed/link, isolation, states; also F-012.AC5, AC9 and AC10, the theme hand-off through the real tool frame) · **F-005** favorites (incl. the COPY-storage.unavailable notice) | F-003 and F-005 need the data store; F-016 needs F-001 |
| 3 · Content pages | **F-008** About · **F-009** Projects · **F-010** Now + changelog | Independent static pages |
| 4 · Navigation | **F-002** catalog · **F-006** recents + days used · **F-004** ⌘K palette | Need F-003, F-009 and F-016 |
| 5 · Platform | **F-011** offline/PWA · **F-015** link previews · **F-014** catalog check (CI) | Need every page in place |
| 6 · Home + backup | **F-007** home dashboard · **F-013** export/import | Need favorites, recents, palette and categories |

**Scale:** about 16 builder agents, about 16 reviewers, about 6 security audits, plus fix rounds. That is roughly 40 agent runs.

**Gate G4 (M-1 build):** all 16 features shipped, CI green, AC coverage 100% (or each gap listed as a manual check), then your approval.

**Not in phase 4:**
- **Real tools.** The JSON Formatter lives in its own project. Its catalog entry stays hidden until it is deployed.
- **Real profile and Now content.** Before release you write your bio, links and Now note as content files.

## Carry-overs
- **F-002**: remove `test.fixme` from `F016_AC4 catalog opens` (tests/e2e/category.spec.ts) and make it pass.
- **F-011 / QA**: project images are copied unoptimized to `/projects/images/<id>.<ext>`; add an optimization step (DEP-31 sharp) if NFR-01 budgets need it.
