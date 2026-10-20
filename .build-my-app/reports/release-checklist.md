# Release checklist: TaroKit v1.0.0 (M-1), channel: web

Prepared 2026-10-20 for main at 8a7c4d2 (Gates G0 to G5 passed). Nothing in this file has been executed.
Claude did not create a repo, push, contact Cloudflare or GitHub, or touch any account. Every item marked **USER** is yours to run.
Not legal advice. Companion files: `publish-plan.md` (the `publish.yml` spec, wrangler config, version tag) and `release-notes-v1.md`.

Legend: **C** = Claude does it (after you say go), **U** = user-owned hard stop. Each U item has Steps, Verify and Rollback.

**Status 2026-10-20 (supersedes the notes below where they differ).** Done: U-1 (real content, plus the Résumé page F-017), U-2 (history rewritten, working repo `~/Documents/personals/taro-kit-release`), U-3 and U-4 (public repo `thanh-taro/taro-kit` under PolyForm Noncommercial 1.0.0, D-051; `main` pushed). Every deploy is manual (D-052): a push never deploys, so the D-047 notes about push deploys and skipped deploys no longer apply. The deploy steps (secrets, staging, custom domains, production, rollback, teardown) now live in `docs/deploy/runbook.md`; follow it instead of U-9 to U-19 where they differ. Variables and secrets: `docs/deploy/environments.md`.

**Updated 2026-10-20 for D-045 to D-048.** C-1 and C-2 are done (branch `worktree-agent-a9b2dfd7cc3a69107`). Staging is its own Worker at `staging.tarokit.app`, deployed only by hand and removed after launch (D-046). Production follows ADR-0007 as written: every green push to `main` deploys to production (D-047); there is no `PRODUCTION_DEPLOY_ENABLED` variable. A push deploys only once `CLOUDFLARE_API_TOKEN` exists in the `production` environment; until then the production deploy is skipped with a notice and the run stays green. So the order below is: staging secrets, staging deploy and checks, then the production secret, the first production deploy and the production custom domain. `package.json` is at `1.0.0`; you create the tag at launch (D-048).

## What was found while preparing (read first)

1. **(Resolved by C-1.) Blocker for C-1: the test suites read the sample content.** 11 test files depend on `content/` (the e2e specs `shell`, `home`, `home-shots`, `catalog`, `projects`, `palette`, `offline`, `offline-shots`, `a11y-qa`; the unit tests `content-validation.test.ts:213` and `offline.test.ts:116,147`). `pnpm build` builds the real `content/`, so replacing the samples turns CI red. Unhiding json-formatter also fails `content-validation.test.ts:213` ("every visible tool is a sample"). Claude must move the samples to test fixtures before you replace them (C-1).
2. **(Resolved by C-2: wrangler 4.147.0, DEP-45.) Wrangler is not installed.** `wrangler` (DEP-28, approved) is not in `package.json` or `pnpm-lock.yaml`, and there is no `wrangler.jsonc`. Needed: C-2.
3. **The commit counts differ from the brief.** `main` has 156 commits, 92 with the work email and 64 with the personal one. The "101" count is across all branches (165 commits, 101 work). If you push only `main`, 92 of 156 are affected. The email also appears as text in `.build-my-app/reports/security-qa.md`. A rewrite of authors does not remove it from file contents.
4. **`gh` is logged in as `er-thanhnt`** (keyring, SSH protocol). Check this is the account you want to own a personal project before you create the repo (U-3).
5. **Future commits are already personal.** `~/.gitconfig` has `includeIf gitdir:~/Documents/personals/` that loads the personal email. A fresh clone must live under that folder or its commits will use the work email again.
6. **The domain and zone already exist** (spikes SP-1/SP-3 ran on `lab.tarokit.app` and `labtool.tarokit.app`; D-035 says Always Use HTTPS is on). So Cloudflare steps below are "verify and clean", not "buy". The spikes may have left Workers and DNS records behind (U-8).
7. **`pnpm build` always targets `https://tarokit.app`.** It clears `TAROKIT_PORTAL_ORIGIN`. A staging build uses `pnpm build:staging` (C-2). Canonical URLs, `og:url`, `og:image`, sitemap and robots all follow the portal origin.
8. **GitHub plan.** Environments and environment secrets in a private repo may need GitHub Pro, Team or Enterprise (verify on your plan, U-5). The `production` environment has no required reviewer (D-047), so no paid reviewer feature is needed. If environments are not available, use repository secrets (U-10, fallback).
9. **Visible sample content is wider than "four sample tools":** 4 visible sample tools, 4 hidden sample tools, 1 hidden sample project, 4 category intros starting "Sample intro:", the sample profile headline, bio, link and Now note.
10. **Policies.** No separate privacy page or terms are needed (section "Policies"). Nothing was drafted for legal review.

---

## Phase 1: Pre-push (local, before any remote exists)

### C-1 (Claude, blocker) Keep the samples for tests, then free `content/` (done)
Done: the samples live in `tests/fixtures/content/samples/`; `pnpm build:samples` builds them into `dist-samples/` (gitignored), which Playwright serves as the production build. No test reads `content/`. Proved with a scratch copy of `content/` (all samples hidden, json-formatter visible) through `TAROKIT_CONTENT_DIR`: unit and Chromium e2e suites green.
1. Copy the 9 sample tool files and `content/projects/sample-project.yaml` into a fixture content folder (for example `tests/fixtures/content/samples/`, with the real `categories.yaml` shape, a profile and a Now note). Do not delete them from git history.
2. Add a build of that folder for e2e (for example `pnpm build:samples`, output `dist-samples/`, never `dist/`), serve it from Playwright, and add `dist-samples/` to `.gitignore` and `check-dist-clean`.
3. Point the 9 e2e specs and the 2 unit tests at the fixture build or folder. Update `content-validation.test.ts:204-213` (the D-012 assertion) so that real content is validated by shape, not by "only samples".
4. Verify: `pnpm test`, the Chromium and WebKit suites and `python3 tools/spec_lint.py --coverage tests` all pass as before (449 unit, 310 Chromium, 279 WebKit, 129/129 ACs).
This touches tests and build scripts, and may need a short spec note in `adapters/tests.md`. Ask first.

### C-2 (Claude) Delivery files (all in `publish-plan.md`) (done)
Done: wrangler 4.147.0 (exact, DEP-45), `wrangler.jsonc`, `pnpm build:staging`, `"version": "1.0.0"`, `workflow_call` on `ci.yml`, `publish.yml`, `scripts/smoke-test.sh`, `.gitignore`, `allowBuilds: workerd: false`. The steps below are the original plan.
- Add `wrangler` `^4` as a devDependency, `wrangler.jsonc`, `build:staging` script, `"version": "1.0.0"`, `workflow_call` on `ci.yml`, `.github/workflows/publish.yml`.
- `.gitignore`: add `.wrangler/`, `.dev.vars`, `.dev.vars.*`, `.env`, `.env.*`, `dist-samples/`.
- Run `pnpm licenses:check` after adding wrangler. New transitive packages (miniflare, workerd, and similar) may need registry rows (ADR-0008). Check whether `pnpm-workspace.yaml` `allowBuilds` needs `workerd` (the deploy job uses `--ignore-scripts`).
- Remove the commented placeholder at the end of `catalog-check.yml` once publish.yml exists.
- Optional (license audit minor 1): link `/third-party-notices.txt` from the About page or a footer.

### U-1 Replace the sample content with the real thing
Edit these files. Run `pnpm content:validate` after each (it prints file and line for any error).

| File | Field | What to do |
|---|---|---|
| `content/profile.yaml` | `headline` | Replace "Sample headline: ..." (max 80 characters). |
| | `bio` | Replace the sample paragraph (max 1500 characters, paragraphs separated by a blank line, first person per PRN-04). |
| | `links` | Replace `Sample link` / `https://example.com/`. Each link has `label` (1 to 40 characters), `url` (`https://` or `mailto:`), and optional `kind` (`email`, `social`, `website`, `code`, `other`). Max 10. |
| | `avatar` (optional) | A PNG, JPEG, WebP or AVIF inside `content/assets/` (for example `avatar: avatar.jpg`). Without it, the About page shows initials. |
| | `location` (optional) | Free text. |
| | `name`, `nickname` | Already set (Nguyen Tri Thanh, Taro). |
| `content/now.yaml` | `body` | Replace the sample note (max 1500 characters). |
| | `updated` | Set to the launch date (`YYYY-MM-DD`). Over 90 days old it is labeled out of date (RULE-09). |
| `content/categories.yaml` | `intro` (4 entries) | Replace each "Sample intro: ..." (max 160 characters). |
| `content/tools/` | 9 `sample-*.yaml` files | Delete them (they only exist in the repo so tests could use them; C-1 keeps copies as fixtures). The 4 visible ones fail the weekly check because their hosts do not exist. `sample-external.yaml` also links `example.com`. |
| `content/projects/sample-project.yaml` | whole file | Delete, or replace with a real project (`id`, `kind: project`, `name`, `summary`, `description`, `links`, `year`, `added`, optional `image` in `content/assets/`). It carries an `example.com` link. |
| `content/tools/json-formatter.yaml` | `hidden: true` | Leave it for now. Remove the line in U-16 after the tool is deployed. Also update the header comment. |

Notes: with no visible tool, the home page and catalog show their empty state (tested). Categories with no tool follow the shipped empty behavior; check it in the preview (U-14). The changelog and what's-new list derive from each entry's `added` date (RULE-04), so set json-formatter's `added` to the day you unhide it if you want it to appear as new.
Verify: `grep -rn "example.com\|Sample\|sample" content/` returns nothing except intentional text. `pnpm build` passes (including `check-dist-clean`). `grep -c sample dist/sitemap.xml` is `0`.
Rollback: `git checkout -- content/`.

### U-2 Decide about the commit author rewrite
Options (recommendation first):
- **A. Rewrite before the first push (recommended if there is any chance the repo goes public).** Work email in 92 of 156 `main` commits. Hashes change; do it once, never after the first push.
- B. Keep as is. Acceptable only if the repo stays private forever. Anyone with access sees the employer address.

Steps for A, using a throwaway single-branch clone so no spike or worktree branch can travel:
1. Commit or stash everything on `main` first (`.build-my-app/state.json` is modified; C-3 commits it). Make a safety copy: `cp -R ~/Documents/personals/taro-kit ~/Documents/personals/taro-kit.backup` (it keeps all branches and worktrees).
2. `brew install git-filter-repo` (not installed today).
3. Create the mailmap file outside the repo, `~/mailmap-taro.txt`, one line:
   `Thanh Nguyen Tri <adamnguyen.itdn@gmail.com> <WORK_EMAIL>` (type your work address in place of WORK_EMAIL)
   Also create `~/replace-taro.txt`, one line, so the address is scrubbed from file contents in every old commit too:
   `WORK_EMAIL==>[work email]`
4. Clone only main, under the personals folder (so the personal email applies):
   `git clone --single-branch --branch main --no-local ~/Documents/personals/taro-kit ~/Documents/personals/taro-kit-release`
5. `cd ~/Documents/personals/taro-kit-release && git filter-repo --mailmap ~/mailmap-taro.txt --replace-text ~/replace-taro.txt` (rewrites author and committer, and the address in old file versions).
6. Remove any leftover mention of the work email in file contents (security-qa.md line about I-3; C-3 does this before the clone, in which case nothing remains).
Verify:
- `git log --format='%ae %ce' | sort | uniq -c` shows only `adamnguyen.itdn@gmail.com`.
- `git rev-list --count HEAD` is 156 or more (plus later commits).
- `git branch -a` shows only `main`. `git grep -i <work domain> $(git rev-list --all)` prints nothing.
- `git log -1 --format=%H` differs from 8a7c4d2 (expected).
- `pnpm install --frozen-lockfile && pnpm build` still passes in the clone.
Rollback: delete `taro-kit-release`. The original and the backup are untouched. Continue with the clone as the working repo from here on (the old folder keeps the spike branches; never push from it).
Do not use `git commit --amend --reset-author` rewrites after a push.

### C-3 (Claude, after U-1 and U-2 are decided) Final commit set
1. Commit `.build-my-app/state.json` and these three reports, plus C-1/C-2 work, in small commits, each ending with the project attribution line.
2. Redact the work email from `.build-my-app/reports/security-qa.md` (I-3 text), only if you chose the rewrite, before the clone in U-2.
3. Run the full local gate, same commands as `ci.yml`: `python3 tools/spec_lint.py`, `python3 tools/token_contrast.py`, `pnpm gen && pnpm gen:check`, `pnpm lint`, `pnpm exec astro check`, `pnpm licenses:check`, `pnpm test`, `pnpm build`, `pnpm fonts:check`, `pnpm exec playwright test --project=chromium --project=webkit`, `pnpm catalog:check` (the last one only after json-formatter is live or the catalog has no visible tool).
Verify: all green; `git status` clean; `git tag` still empty.

---

## Phase 2: Repo and CI

### U-3 Check the GitHub account
`gh auth status` shows `er-thanhnt`. Decide if that is the owner of the repo. To use another account: `gh auth login` (choose GitHub.com, SSH, authenticate in the browser) then `gh auth switch --user <name>`. Check which SSH key GitHub will offer: `ssh -T git@github.com` greets with the account name.
Verify: the greeting names the right account. Rollback: `gh auth logout --user <name>`.

### U-4 Create the private repo and push `main` only
Run these in the (rewritten) repo folder. Replace `<owner>` with your account.
1. `gh repo create <owner>/taro-kit --private --source=. --remote=origin --description "TaroKit, Taro's personal portal"` (without `--push`).
2. `git remote -v` shows only `origin` with the new URL.
3. Check what would leave the machine: `git branch -a` lists only `main`; `git log --oneline | wc -l`; `git ls-files | wc -l` (about 831 files: reports, screenshots, specs).
4. Push exactly one branch: `git push -u origin main`. Never use `--all`, `--mirror`, `--tags` for the first push. Never push `spike/*` or `worktree-*` or `qa/*` branches. `spike/sp1-sp3` holds the Cloudflare account id and about 525 committed `node_modules` files.
5. Branch protection later (U-6).
Verify: `gh repo view <owner>/taro-kit --json visibility,defaultBranchRef` shows `PRIVATE` and `main`; `gh api repos/<owner>/taro-kit/branches --jq '.[].name'` prints only `main`.
Rollback: `gh repo delete <owner>/taro-kit --yes` (needs `gh auth refresh -s delete_repo` first). Remember a push of the wrong history cannot be recalled from forks or clones; delete and recreate the repo.

### U-5 Check plan features, then create the GitHub environments
1. Open the repo, Settings, Environments. If "New environment" is offered, use environments (no reviewers are needed). If it says environments need a paid plan, use repository secrets instead (U-10, fallback).
2. New environment `staging`: deployment branch `main`, no reviewers.
3. New environment `production`: Deployment branches and tags, Selected branches and tags, add `main`. No required reviewer (D-047). Do not add its secrets yet (that is U-17).
Verify: `gh api repos/<owner>/taro-kit/environments --jq '.environments[].name'` lists both.
Rollback: delete the environments in the same page.

### U-6 Repository settings
- Settings, Actions, General: Actions permissions "Allow <owner>, and select non-<owner>, actions", allow actions by full-length SHA only (the workflows pin SHAs); Workflow permissions "Read repository contents" (read only); untick "Allow GitHub Actions to create and approve pull requests".
- Settings, Branches: optionally add a rule for `main` (branch protection on private repos may need a paid plan; working solo with direct pushes is fine).
- Settings, Security: enable Dependabot alerts (private repos: available).
- Actions minutes: private repos on Free have 2,000 minutes per month. Watch Settings, Billing.
Verify: `gh api repos/<owner>/taro-kit/actions/permissions/workflow --jq .default_workflow_permissions` prints `read`.

### U-7 First CI run
1. Create a branch and a PR (`git switch -c ci/first-run && git push -u origin ci/first-run && gh pr create --fill`), or just view the run that `workflow_dispatch` offers: `gh workflow run ci.yml --ref ci/first-run`.
2. Watch: `gh run watch`.
Verify: `checks` is green. CI has never run on GitHub (gate-build.md). Possible first-run differences: Python/pip, Playwright browser install, pnpm 11 setup. Report failures to Claude.
Rollback: close the PR and delete the branch.
Note the weekly `catalog-check` also appears under Actions: it runs Monday 03:17 UTC and fails until the sample tools are gone (this is why U-1 comes first). Disable it until go-live if you like: `gh workflow disable catalog-check.yml`, and `gh workflow enable catalog-check.yml` in U-18.

---

## Phase 3: Cloudflare (all user-owned)

### U-8 Inventory and clean up the account (the spikes were run here)
1. Dash: Workers & Pages. List Workers. Delete any left over from spikes (names like `lab`, `labtool`, `sp1`, `sp3`) that you do not need.
2. Dash, `tarokit.app`, DNS, Records. Delete records for `lab`, `labtool`, any `sample-*`, and anything else you do not recognize. Keep the records of real tool hosts.
3. Dash, `tarokit.app`, SSL/TLS, Overview: mode **Full (strict)**; Edge Certificates: Always Use HTTPS **On** (D-035), Minimum TLS **1.2**, Automatic HTTPS Rewrites on is fine.
4. Zone hygiene for NFR-05 (ADR-0007), all **Off**:
   - Analytics & Logs, Web Analytics: no site enabled for `tarokit.app` (D-037);
   - Scrape Shield, Email Address Obfuscation;
   - Speed, Optimization, Content Optimization: Rocket Loader; Auto Minify (if shown); Mirage and Polish are not needed; Early Hints is fine;
   - Zaraz: not set up;
   - Security, Bots: Bot Fight Mode (it sets a cookie);
   - Caching, Configuration, Browser Cache TTL: **Respect Existing Headers**.
   Also check Workers observability/logs stays disabled on the new Worker.
Verify (after the first deploys, U-13 and U-17): the smoke test and the DevTools Network check show zero third-party requests and no `Set-Cookie`.
Rollback: Cloudflare keeps no history; note each setting you change.

### U-9 Create the API token (least privilege)
1. Dash, top right profile, My Profile, API Tokens, Create Token, "Create Custom Token".
2. Name: `taro-kit-github-deploy`.
3. Permissions: `Account` / `Workers Scripts` / `Edit`. That is the starting minimum for `wrangler deploy` of static assets. If wrangler later complains, add only the missing one (commonly `Account` / `Account Settings` / `Read`) and re-run. Do not add Zone permissions: the custom domain is attached in the dashboard (U-11) so CI never changes DNS.
4. Account Resources: Include, this account only.
5. Zone Resources: none.
6. TTL: set an end date about 12 months out and add a calendar reminder.
7. Continue to summary, Create Token. Copy the token once (it is shown once). Do not paste it in chat, a file or a commit.
8. Your Account ID: Dash, Workers & Pages, Overview, right column, "Account ID". It is not a secret but keep it out of the repo (it is a secret in GitHub below because the workflow reads it from there).
Verify: `curl -s -H "Authorization: Bearer $TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify` shows `"status":"active"` (run it in your own terminal with the token in an env var, never committed).
Rollback: API Tokens, the token, Roll or Delete.

### U-10 Store the staging secrets (production comes later, in U-17)
Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Nothing else.
1. `gh secret set CLOUDFLARE_API_TOKEN --env staging --repo <owner>/taro-kit` (paste when prompted), then `gh secret set CLOUDFLARE_ACCOUNT_ID --env staging --repo <owner>/taro-kit`.
2. Do **not** set them in `production` yet. Every push to `main` deploys production as soon as `production` has the token (D-047); until then publish.yml skips the production deploy with a notice.
Fallback (no environments on your plan): repository secrets apply to both deploy jobs, so a push would also deploy production. That deploy is not public until the `tarokit.app` custom domain is attached (`workers_dev` is off), so in this case keep U-17 step 4 (attaching the production domain) as the go-live switch, and do not attach it before U-14 passes.
The first `wrangler deploy` creates the Workers `tarokit-staging` and later `tarokit`; no dashboard step is needed, but check both names are free (U-8). Do this only when you are ready to run the staging deploy (U-13).
Verify: `gh secret list --env staging --repo <owner>/taro-kit` lists the names (values are never shown); `gh secret list --env production --repo <owner>/taro-kit` lists nothing.
Rollback: `gh secret delete CLOUDFLARE_API_TOKEN --env staging`, and delete or roll the token in Cloudflare.

### U-11 Attach the custom domains (staging after its first deploy in U-13; production only at go-live, U-17, after staging passed U-14)
- Staging: Workers & Pages, `tarokit-staging`, Settings, Domains & Routes, Add, Custom domain, `staging.tarokit.app`. Cloudflare creates the DNS record and certificate.
- Production: Workers & Pages, `tarokit`, Settings, Domains & Routes, Add, Custom domain, `tarokit.app` (the apex). Do this only at go-live (U-17), after staging is accepted.
- `www.tarokit.app` (optional): add a proxied DNS record (`www` CNAME to `tarokit.app`, proxied) and a Redirect Rule (Rules, Redirect Rules, from `www.tarokit.app` to `https://tarokit.app`, 301, preserve path).
- In both Workers, Settings, Domains & Routes: turn **workers.dev** and **Preview URLs** off (the wrangler config sets this too).
- Reserve the hostname `staging` so no tool is named `staging` (INV-03 and the tool subdomain layout).
Verify: `dig +short staging.tarokit.app` resolves; `curl -sI https://staging.tarokit.app/` returns `200` after U-13.
Rollback: remove the custom domain in the same page (the DNS record goes with it).

---

## Phase 4: Staging and manual checks (before going live, D-044)

### How staging works
- A second Worker, `tarokit-staging`, on `staging.tarokit.app` (same registrable site as the tools, so the storage checks mean something). Deployed by `publish.yml` with `workflow_dispatch` `target=staging`, or by hand with wrangler.
- Built with `TAROKIT_PORTAL_ORIGIN=https://staging.tarokit.app`, so canonical URLs, `og:url`, `og:image`, the sitemap and robots all name the staging host. `pnpm build` cannot do this (it clears the variable), hence `pnpm build:staging` (`publish-plan.md`).
- INV-03 holds: staging is its own origin; no tool is served from it, and the build still refuses the production origin for tools. The service worker scope is `/` and per-origin, so staging and production never share a worker or cache. Uninstall the staging app afterward (U-14, step 6).
- Rejected: `*.workers.dev` or preview URLs. They sit on a public suffix, so embedded storage is not same-site (F-003.AC11, D-038 results would be wrong), link previews would name the wrong host, and ADR-0007 forbids them for the portal.
- Staging must be reachable by link-preview crawlers (F-015), so it is public but unlinked. Its pages carry `robots.txt: Allow` from the build; the sitemap is never submitted. Treat it as temporary: delete the Worker and domain after go-live (U-19).
- Tools on staging: the embedded json-formatter replies `frame-ancestors https://tarokit.app` only, so the browser refuses it on staging. In the json-formatter project (user-owned, outside this repo), add `https://staging.tarokit.app` to its `frame-ancestors` for the test, and remove it again after (U-19). Do this only if you want to test an embedded tool on staging; otherwise the "needs the tool" and refused-embed states are what you will see (also worth a look).
- `pnpm catalog:check` and the pre-deploy gate always check against the production origin (`https://tarokit.app`). That is what you want: the tool must allow production.

### U-12 Deploy json-formatter in its own project (prerequisite for an embedded test)
In the json-formatter project: deploy at `https://json-formatter.tarokit.app/` with `Content-Security-Policy: frame-ancestors https://tarokit.app` (and the staging origin during tests, see above), responding over https with no redirect to an http address.
Verify: `curl -sI https://json-formatter.tarokit.app/` returns 200 and the CSP header; from this repo (after U-1) `pnpm catalog:check` passes.
Rollback: remove the DNS record and Worker of that project.

### U-13 Deploy staging
1. Push the commit to test to `main` (U-4). That push runs every gate; its production deploy is skipped with a notice (no production secret yet).
2. `gh workflow run publish.yml --ref main -f target=staging --repo <owner>/taro-kit`, then `gh run watch`.
3. On the very first staging run the `smoke-staging` job fails, because the Worker did not exist before and has no domain yet. That is expected. Add the staging custom domain (U-11), wait about one minute, then re-run only the failed job: `gh run rerun <run-id> --failed`.
4. Later staging deploys run the smoke test against the attached domain and must pass. You can also run it by hand: `scripts/smoke-test.sh staging.tarokit.app`.
Verify: `curl -sI https://staging.tarokit.app/` shows 200 plus the headers `content-security-policy`, `permissions-policy`, `strict-transport-security`, `cache-control: no-cache, no-transform`; `curl -s https://staging.tarokit.app/robots.txt` names the staging sitemap; `curl -s -o /dev/null -w '%{http_code}\n' https://staging.tarokit.app/t/nope/` prints `404`.
Rollback: `pnpm exec wrangler rollback --env staging` (previous version), or delete the Worker.

### U-14 Manual checks on staging (record pass or fail next to each)
Use fresh profiles/private windows where stated. Anything that fails: tell Claude with the page and browser; do not go live.

1. **Screen reader** (VoiceOver on macOS and iOS Safari; NVDA on Windows with Firefox or Chrome): run the 10 steps in `a11y-qa.md`, section "Manual checks for a real screen reader". Step 9 (update message) needs a second deploy: deploy staging twice, keep the first tab open, then reload.
2. **Firefox (two latest majors):** every flow (FLOW-01 find and open a tool, FLOW-02 first visit, FLOW-03 backup). Optionally run `pnpm exec playwright test --project=firefox` against your machine (the sandbox could not launch Firefox).
3. **Safari (macOS and iOS):**
   - offline: install or load, turn off the network, reload: home, `/tools/`, a category, settings still open; offline label shown;
   - clipboard (F-003.AC3): in a tool without the clipboard permission, copy fails or is refused as designed; Safari does not block it (known; D-038/SP-3), note the observed behavior;
   - embedded storage (F-003.AC11, D-038): needs the json-formatter staging embed. Expected in Safari: the embedded tool's localStorage is separate from the direct visit (partitioned). Chromium: shared. Confirm the Settings and tool messages match;
   - CLS: DevTools, Performance, layout shifts on home, `/tools/`, a tool page; expect about 0.
4. **Real phone on 4G** (`perf-qa.md` "Manual checklist" 1, 2, 4): wifi off; fresh private tab on `https://staging.tarokit.app/`; remote debugging (chrome://inspect for Android, Safari Web Inspector for iOS); record FCP/LCP (target greeting and search usable within 1.5 s on the reference profile); tap the search entry right after first paint; type fast in the palette and the catalog filter, no dropped characters.
5. **Touch targets:** every button and row is at least 44 px (axe measured it at 390 px; confirm by thumb on the phone; check the favorite star, menu, theme toggle, palette rows).
6. **Install and offline (F-011.AC1):** Chrome: install icon in the address bar, or Android menu, Install app; iOS: Share, Add to Home Screen. Open it: it opens in its own window and start URL `/`. Close it, airplane mode, relaunch: shell under 0.5 s, every page works. Check update prompt after a second staging deploy. Then **uninstall** the staging app (it shares the TaroKit name and icon).
7. **Link preview (F-015):** paste `https://staging.tarokit.app/`, `/about/` and a category URL into a real chat or social composer you own (for example a private chat with yourself on Slack, WhatsApp, iMessage, Telegram, or the Facebook Sharing Debugger and the LinkedIn Post Inspector). Expect the title "TaroKit - Taro's tools and work", the description and the 1200 x 630 image. Chat services cache previews per URL, so the staging result says nothing about the production cache. Re-test once on production after go-live (U-18).
8. **Third-party and cookies:** DevTools, Network: only same-origin requests (plus the json-formatter frame); Application, Cookies: none for `staging.tarokit.app`.
9. **Content read-through:** About, Now, Projects, category intros read as you want, in Taro's voice.

Pass criterion: no blocker (anything that makes a flow unusable, a privacy leak, a wrong host in a preview). Minor findings go to a follow-up list.
Rollback: not needed, staging is isolated.

---

## Phase 5: Go-live (user-owned)

### U-15 Final pre-flight (the day of)
1. `git status` clean on the rewritten clone, `git log origin/main..` empty, content from U-1 committed.
2. json-formatter: decide to show it (U-16). If yes, it must already answer at `https://json-formatter.tarokit.app/` (U-12).
3. `pnpm catalog:check` passes locally against live hosts. It exits 0 for pass, 1 when a tool fails, 2 when it cannot run.
4. Staging checks (U-14) passed.
5. Token still valid (U-9), `staging` and `production` environments exist, staging secrets set (U-10), production secrets **not** set yet.

### U-16 Unhide json-formatter (only now)
Edit `content/tools/json-formatter.yaml`: delete the line `hidden: true` and update the header comment; set `added:` to today if you want it shown as new. Commit, push to `main`. The `publish.yml` run on that push does checks and the catalog gate; the production deploy is skipped with a notice because `production` has no token yet (U-17).
Verify: the run's `catalog-gate` job passed; the pre-deploy report lists `json-formatter` as checked.
Rollback: re-add `hidden: true`, push.

### U-17 Production secret, first production deploy and domain
Only after U-14 passed on staging. This is going live. Only you do it.
1. Add the production secrets: `gh secret set CLOUDFLARE_API_TOKEN --env production --repo <owner>/taro-kit`, then `gh secret set CLOUDFLARE_ACCOUNT_ID --env production --repo <owner>/taro-kit`. From now on, every green push to `main` deploys production (D-047).
2. `gh workflow run publish.yml --ref main -f target=production --repo <owner>/taro-kit` (or push a commit), then `gh run watch`. This first deploy creates the Worker `tarokit`.
3. The first run's `smoke-production` job fails, because `tarokit.app` is not attached yet. That is expected.
4. Workers & Pages, `tarokit`, Settings, Domains & Routes, Add custom domain `tarokit.app` (U-11). Add the `www` redirect if wanted. Wait about one minute.
5. `gh run rerun <run-id> --failed` re-runs only the smoke job, which must now pass (or run `scripts/smoke-test.sh tarokit.app`).
Verify: `curl -sI https://tarokit.app/` shows 200 and the header set; `curl -s https://tarokit.app/robots.txt | grep Sitemap` shows `https://tarokit.app/sitemap.xml`; `/t/nope/` returns 404; `/sw.js` and `/manifest.webmanifest` have `no-cache`; no `set-cookie` header on any response: `curl -sI https://tarokit.app/ | grep -i set-cookie` prints nothing; open the site in a private window; the Network tab shows only `tarokit.app` (and `json-formatter.tarokit.app` in the tool view).
Rollback (fast): Workers & Pages, `tarokit`, Deployments, pick the previous version, "Rollback"; or `pnpm exec wrangler rollback` (with the token in the environment variable). If it was the first deploy: Settings, Domains & Routes, delete the custom domain `tarokit.app` (the site goes dark). Content rollback: `git revert <commit>` and push (a new deploy).

### U-18 Tag, release notes, re-enable checks
1. On the deployed commit: `git tag -a v1.0.0 -m "TaroKit v1.0.0 (M-1)"`, then `git push origin v1.0.0` (a single tag, never `--tags`). Make sure `package.json` has `"version": "1.0.0"` in that commit (C-2).
2. `gh release create v1.0.0 --repo <owner>/taro-kit --title "TaroKit v1.0.0 (M-1)" --notes-file .build-my-app/reports/release-notes-v1.md` (use `--draft` first to review). The file's "Technical summary" section is for the release page; the first-person part is for the site's changelog if you want it.
3. `gh workflow enable catalog-check.yml` if you disabled it.
4. Re-run the real link preview test on production URLs (U-14 step 7).
Verify: `git ls-remote --tags origin` shows `v1.0.0`; the release page shows the notes.
Rollback: `gh release delete v1.0.0 --yes`, `git push origin :refs/tags/v1.0.0`, `git tag -d v1.0.0`.

### U-19 Staging teardown
Delete the Worker `tarokit-staging`, the `staging` DNS record and the `staging` GitHub environment; remove `https://staging.tarokit.app` from json-formatter's `frame-ancestors`; uninstall any installed staging app. Keep the staging pieces if you want a standing preview (then keep the token expiry reminder).
Rollback: re-add them (U-11, U-13).

---

## Phase 6: Post-launch

- **Weekly catalog check:** `catalog-check.yml` runs Mondays 03:17 UTC against `main` and never deploys. A failure sends GitHub's failed-workflow email to the account's notification address. Check Settings, Notifications, Actions: "Send notifications for failed workflows only" is on and the email is right. Open the run summary for the per-entry report. Fix: update the URL or `hidden: true`, push (the publish run deploys).
- **Scheduled workflows stop after 60 days without repository activity (public repos; a known risk in ADR-0007).** The repo is private, where the rule is not documented the same way, but keep it alive: a monthly reminder to commit (a Now note update does it, RULE-09 asks for one every 90 days anyway). If disabled: Actions tab, "Enable workflow" or `gh workflow enable catalog-check.yml`.
- **Monitoring without analytics (NFR-05, D-037):**
  - Uptime: a free external monitor that makes only its own requests (for example UptimeRobot or Better Stack free tier) on `https://tarokit.app/` and one tool host. It collects nothing from visitors. Your call; it is optional.
  - Cloudflare dashboard, Workers & Pages, `tarokit`, Metrics: request and error counts from the platform, no visitor script. Leave Web Analytics off.
  - Cloudflare notification: Notifications, Add, "Workers Usage" and "SSL Certificate" and Health on the zone, email to you.
  - The days-used count (RULE-13) on Settings is your own usage signal for M-1's "done when" (at least 10 of the last 14 days). It stays on your device.
- **Token rotation:** on the expiry date in U-9: create a new token, `gh secret set` both environments, delete the old one.
- **Dependencies:** Dependabot alerts on; `pnpm audit` before each release (clean today: no known vulnerabilities). `minimumReleaseAge` is 3 days.
- **Next version:** content changes (new tools, Now) are not releases; they deploy by pushing to `main`. Tag `1.0.x` for fixes, `1.1.0` for the M-2 batch (see `publish-plan.md`).
- **Known M-2 items:** one shared tool page in the precache before the catalog passes about 100 tools (`perf-qa.md`).

## Policies (D-041)

**Settings privacy statement.** It is now three paragraphs: COPY-settings.privacy (nothing leaves the browser unless exported), COPY-settings.privacyTools (tools are separate sites; only the theme is told), COPY-settings.privacyHosting (Cloudflare handles request data; no analytics). Verified in `specs/30-experience/copy.md:123-125`.

**Separate privacy page: not needed for M-1. Terms: not needed.** Reasons: the portal has no accounts, forms, cookies, analytics or server-side code; personal data never leaves the device (INV-05); the only processing by a third party is Cloudflare's request handling, which the statement names; there is no store listing (web channel, no app store privacy form). The statement is already linked from Settings, one tap away from every page. A separate page would add a screen, copy and a spec change for no new fact.
Revisit (and then draft, "needs legal review") if any of these happen: accounts or sync (M-3), analytics, any form that sends data, a contact form, ads, a newsletter, selling or distributing a tool with its own data, a public repo that accepts contributions (add a license choice), or a request from a platform or employer. Tools must carry their own privacy text.
Code license: the repo has no `LICENSE` file. Until you choose, the default is "all rights reserved", which suits a private repo. Choose one (for example MIT) before making it public. Third-party notices ship at `/third-party-notices.txt` (license audit 2: release-clean, no legal review needed).

**Declaration (no data collected), for the record:**
> TaroKit collects no data. There are no accounts, analytics, trackers, advertising identifiers or cookies. Favorites, recent tools, days used and the theme preference are stored only in this browser (localStorage) and leave it only when the user exports a backup file. Embedded tools are told which theme is showing (light or dark) and nothing else. The site is served by Cloudflare, which processes request data (such as IP address and browser) to deliver and protect the site; Cloudflare Web Analytics is off. Each tool is its own site under its own privacy policy.
Source: security-qa.md (verified: no cookies, no third-party requests, `fetch` limited to same-origin; `pnpm audit` clean).

## Go/no-go summary (tick before U-17)
- [ ] C-1, C-2, C-3 done; CI green on GitHub
- [ ] Sample content gone, real profile, bio, links, Now, category intros in
- [ ] Author decision made and applied before the first push
- [ ] Only `main` pushed; no `spike/*`, `worktree-*` or `qa/*`
- [ ] Zone hygiene and DNS clean (U-8)
- [ ] Staging passed U-14
- [ ] json-formatter deployed, then unhidden
- [ ] Token scoped, expiry set; staging secrets in place; production secrets added only in U-17
- [ ] Rollback understood (Cloudflare Deployments, Rollback)
