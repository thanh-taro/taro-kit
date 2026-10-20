# TaroKit deployment runbook (v1.0.0)

How a release candidate reaches `staging.tarokit.app` and `tarokit.app`. Variables, secrets and domains are listed in
[environments.md](environments.md). Every deploy is manual (D-052): a push to `main` runs the gates and never ships.
Steps marked **[Owner]** need the Owner's accounts; Claude never types a password or a token.

## 0. Pre-flight (Claude, then the Owner checks)

1. `main` is clean and pushed, and HEAD carries the candidate tag (`v1.0.0-rc.N`). A GitHub deploy builds `main` HEAD,
   so HEAD must be the tag commit.
2. `scripts/release-build.sh v1.0.0-rc.N` (and `--staging`) succeeds; its checksums are recorded in
   `.build-my-app/reports/release-1.0.0.md`.
3. The latest `publish` run for that commit is green (every gate, no deploy).

## 1. One-time setup [Owner]

1. **Zone.** Cloudflare dashboard → Websites: `tarokit.app` is listed and Active. Note the **Account ID** (right-hand
   sidebar of the zone's Overview page).
2. **API token** (only for deploys from GitHub). My Profile → API Tokens → Create Token → template "Edit Cloudflare
   Workers" → Permissions: keep only **Account → Workers Scripts → Edit**; Account Resources: **Include → your
   account**; Zone Resources: none; set an expiry date → Continue → Create. Copy the token once.
3. **GitHub environments and secrets.** In a terminal (each command asks for the value; paste it, it is never
   echoed):
   ```sh
   gh auth switch --user thanh-taro
   gh api -X PUT repos/thanh-taro/taro-kit/environments/staging
   gh api -X PUT repos/thanh-taro/taro-kit/environments/production
   gh secret set CLOUDFLARE_API_TOKEN  --env staging    --repo thanh-taro/taro-kit
   gh secret set CLOUDFLARE_ACCOUNT_ID --env staging    --repo thanh-taro/taro-kit
   gh secret set CLOUDFLARE_API_TOKEN  --env production --repo thanh-taro/taro-kit
   gh secret set CLOUDFLARE_ACCOUNT_ID --env production --repo thanh-taro/taro-kit
   ```
   Optional: Settings → Environments → production → Deployment branches: "Selected branches" → `main`.
4. **Local deploys instead** (Option B below): `npx wrangler login` in the repo folder. It opens the browser to
   authorize wrangler; `npx wrangler whoami` then shows the account.

## 2. Deploy, two manual ways

### Option A (recommended): GitHub Actions

Runs every gate on the tagged commit, then deploys that exact build.

- Web: github.com/thanh-taro/taro-kit → Actions → publish → Run workflow → branch `main`, target `staging` or
  `production`.
- Terminal: `gh workflow run publish --repo thanh-taro/taro-kit -f target=staging` (or `-f target=production`), then
  `gh run watch --repo thanh-taro/taro-kit`.

The smoke test runs after the deploy. On the first deploy of each Worker it fails until its custom domain is attached
(step 3); rerun it with `gh run rerun <run-id> --failed --repo thanh-taro/taro-kit`.

### Option B: local, from a checked release build

After `npx wrangler login` [Owner], from a clean checkout of the tag:

```sh
WRANGLER_SEND_METRICS=false
scripts/release-build.sh --staging v1.0.0-rc.N        # builds dist/ for staging
npx wrangler deploy --env staging --message "v1.0.0-rc.N"
scripts/release-build.sh v1.0.0-rc.N                  # rebuilds dist/ for production
npx wrangler deploy --message "v1.0.0-rc.N"
```

Each build writes dist/ for its own target, so always rebuild before switching targets.

## 3. Custom domains, once per Worker [Owner]

After a Worker's first upload: Cloudflare dashboard → Workers & Pages → `tarokit-staging` (or `tarokit`) →
Settings → Domains & Routes → Add → Custom domain → `staging.tarokit.app` (or `tarokit.app`) → Add domain.
Cloudflare creates the DNS record and certificate; allow a few minutes. If it reports an existing record with that
name, delete that record in DNS first.

## 4. Staging first (D-044)

1. Deploy staging (Option A or B), attach `staging.tarokit.app`, then `scripts/smoke-test.sh staging.tarokit.app`.
2. **[Owner]** manual checks on staging, recorded in `.build-my-app/reports/release-1.0.0.md`:
   - screen reader (VoiceOver, NVDA): the ten steps in `.build-my-app/reports/a11y-qa.md`;
   - Firefox: home, catalog, palette (⌘K / Ctrl K), Résumé, settings export and import;
   - Safari (macOS and iOS): offline after one visit, the clipboard restriction (F-003.AC3), embedded storage
     (F-003.AC11, D-038), no layout jumps;
   - a real phone on 4G: first load, touch targets, install to the home screen and open offline (F-011.AC1);
   - DevTools Network on a full page load: no request to any other host (NFR-05);
   - a link preview pasted into a chat app (F-015).
3. Fix anything found as a new candidate (`rc.N+1`), from phase 6 step 3.

## 5. Production

1. Deploy production (Option A with target `production`, or Option B).
2. Attach `tarokit.app` (step 3) on the first deploy.
3. `scripts/smoke-test.sh tarokit.app`, then open https://tarokit.app, /about/, /resume/ and ⌘K.
4. **[Owner]** tag the release: `git tag -a v1.0.0 -m "TaroKit 1.0.0" <rc commit> && git push origin v1.0.0`, and
   optionally a GitHub release with `.build-my-app/reports/release-notes-v1.md`.

## 6. Monitoring without analytics (NFR-05)

- The weekly `catalog-check` workflow: a failure email means a tool address or embedding broke.
- GitHub → Actions run history for every gate and deploy.
- Cloudflare dashboard → Workers & Pages → `tarokit` → Metrics: request counts and errors (platform data only; no
  Web Analytics, no RUM beacon).

## 7. Rollback

- **Fast (Cloudflare keeps earlier versions):** `npx wrangler deployments list` (add `--env staging` for staging),
  then `npx wrangler rollback <version-id> --message "rollback: <reason>"`. Or dashboard → the Worker → Deployments →
  the previous version → Rollback.
- **Rebuild a known tag:** check out the previous tag and deploy it with Option B, or move `main` back only by a
  normal revert commit (never force-push) and run Option A.
- **Domain:** to take the site offline, remove the custom domain in Settings → Domains & Routes; the Worker stays.

## 8. Teardown of staging (after launch)

Dashboard → Workers & Pages → `tarokit-staging` → Settings → Delete (this also removes `staging.tarokit.app`). Then
delete the `staging` GitHub environment (Settings → Environments). Keep the `env.staging` block in `wrangler.jsonc`
for future candidates, or remove it in a normal commit.

## 9. Later: unhiding a tool (json-formatter)

When the tool is live on its own subdomain: remove `hidden: true` in `content/tools/json-formatter.yaml` (set
`added` to that day to show it as new), commit, cut a new candidate, run `pnpm catalog:check`, then deploy it as above.
