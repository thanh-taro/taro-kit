# Spike SP-1 — Same storage when embedded vs opened directly (3 h)

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-1.
- Time box: shared 5 h with SP-3. Code: `spikes/sp1-sp3/` on branch `spike/sp1-sp3` (never merged into `src/`).
- Lab hosts (D-033): `https://lab.tarokit.app/` (portal) and `https://labtool.tarokit.app/` (tool), each a Cloudflare Worker with static assets, noindex, robots `Disallow: /`, no analytics, no personal data.
- Note: this framing file was not present (only the template `spike-.md`, filled in for SP-3). It was recreated here from the brief. The first agent worktree was also removed mid-run; the code was rewritten from the same source and re-run, so every number below comes from the second run unless marked.

## SP-1 result

**Verdict: ADAPT. ADR-0001 cannot be accepted as written.** Chromium passes completely. WebKit shares localStorage and cookies, but **not IndexedDB or the service worker**: WebKit keys those by the top-level *origin*, not the site, so `lab.tarokit.app` and `labtool.tarokit.app` get separate copies. Real Safari still has to be checked for localStorage (one command, below). That check decides between the two outcomes:
- **Safari shares localStorage** (expected): accept ADR-0001 and narrow F-003.R8 to "data kept in localStorage or cookies". IndexedDB, Cache Storage and service workers are per-context on WebKit.
- **Safari does not share localStorage**: reject ADR-0001 and escalate to the user. The fallback is same-origin path routing, which couples deploys (PRN-01).

### Evidence (live hosts, Playwright 1.56.1, 2026-10-13)

Each cell is localStorage / IndexedDB / Lax cookie / None cookie. "A" or "B" means the right value was read, and "-" means the store was empty.

| Scenario | Engine | 3.2 embedded reads A | 3.4 direct reads B | SW controls embedded frame at load | `hasStorageAccess()` embedded | Cross-site control (same tool under another site) | Pass |
|---|---|---|---|---|---|---|---|
| chromium | Chromium 141, partitioning re-enabled | A/A/A/A | B/B/B/B | yes | true | -/-/-/B (partitioned) | **yes** |
| chromium-3pc-blocked | Chromium 141, 3PC blocked | A/A/A/A | B/B/B/B | yes | true | -/-/-/- , hsa false (blocking active) | **yes** |
| chrome | Google Chrome 155 | A/A/A/A | B/B/B/B | yes | true | -/-/-/B | **yes** |
| chrome-3pc-blocked | Google Chrome 155, 3PC blocked | A/A/A/A | B/B/B/B | yes | true | -/-/-/- | **yes** |
| chromium-pw-default | Chromium 141, Playwright defaults | A/A/A/A | B/B/B/B | yes | true | B/B/-/B (**not partitioned**) | invalid oracle |
| webkit | WebKit 26 (Playwright) | A/**-**/A/A | B/**A**/B/B | **no** | **false** | B/-/-/- (localStorage not partitioned even cross-site) | **no** (IndexedDB, SW) |
| firefox | Firefox 142 (Playwright), first run only | A/A/A/A | B/B/B/B | n/a (Playwright Firefox never had SW control, even directly) | true | control errored | **yes** |
| firefox-strict | Firefox 142, ETP Strict | not run | — | — | — | — | — |

- A fresh browser context (the private-window analogue) saw nothing in any engine, as expected.
- Raw JSON is in `spikes/sp1-sp3/results/sp1-*.json`. The scripts are `node tests/sp1.mjs <scenario>` and `node tests/sp1-safari.mjs`.

### What surprised us
1. **WebKit partitions IndexedDB and the service worker by top-level origin.** Same-site is not enough. SP-4 saw the same thing for the service worker. On WebKit, embedded `hasStorageAccess()` is `false` even on the same site.
2. **Playwright turns off Chromium storage partitioning** (`--disable-features=…ThirdPartyStoragePartitioning…`, playwright#32230). With Playwright's defaults, even an unrelated site shares storage, so an F-003.AC11 test would pass for the wrong reason. The test must remove that flag, as `tests/sp1.mjs` does.
3. **Playwright WebKit does not partition localStorage even for an unrelated top-level site.** It is not a trustworthy oracle for Safari's localStorage, so the real-Safari check is required.
4. **Cloudflare injected its Web Analytics beacon** (`static.cloudflareinsights.com`) into the lab HTML. The zone has automatic RUM injection on. The beacon was removed per response with `Cache-Control: no-transform`, and the tool CSP now also sets `script-src 'self'`. No zone setting was changed. Production would hit the same thing, which breaks NFR-05.
5. Firefox is killed with SIGTERM at launch in this agent sandbox most of the time. 2 of about 50 launches got through, both in the first run (the SP-1 row above). ETP Strict and the SP-3 matrix were never reached.

### Commands for the user (results land in `spikes/sp1-sp3/results/`)
```
cd spikes/sp1-sp3 && npm install
node tests/sp1.mjs firefox firefox-strict          # Firefox rows
# Real Safari: Safari > Settings > Advanced > "Show features for web developers",
# then Developer menu > "Allow Remote Automation". Then:
node tests/sp1-safari.mjs                           # decides the verdict
```

### Manual checklist (phones and installed apps)
URLs: portal `https://lab.tarokit.app/`, tool `https://labtool.tarokit.app/`. On each line, record the localStorage, IndexedDB and cookie values that the frame shows.
1. **Safari macOS, normal window.** Open the tool, tap "Write new value…" and note value A. Open the portal: does the frame show A in all three rows? Write in the frame (value B), then reload the tool directly: does it show B?
2. **Safari macOS, private window.** Same steps. Expect isolation from the normal window, and record whether the frame and the direct page match each other.
3. **Safari iOS, normal tab.** Same as 1.
4. **iOS "Add to Home Screen" (portal).** Open the installed app, write in the frame, then open the tool in Safari. The installed app is expected to differ (U-1, already exempt in F-003.R8). Record it.
5. **Safari macOS "Add to Dock" (portal).** Same as 4.
6. **Chrome Android, normal tab**, then **installed PWA** (menu > Install or Add to Home screen). Same as 1, then 4.
7. **Chrome desktop installed PWA.** Install the portal, write in the frame, use the tool link "open in new tab" in a normal tab, and compare.
8. **Firefox desktop, ETP Standard, then Strict** (Settings > Privacy). Same as 1.
9. **Edge desktop.** Same as 1.

### Proposed spec and ADR edits (for the user to approve)
- **ADR-0001:** stays `proposed` until step 1 or `sp1-safari.mjs` is done. If Safari shares localStorage, accept it with a new consequence: "Shared across embedded and direct contexts: localStorage and cookies on every engine; IndexedDB, Cache Storage and service workers are partitioned by top-level origin on WebKit." Otherwise, escalate.
- **F-003.R8 and AC11:** narrow them to "data an own tool keeps in localStorage". Add a tool-author note: shared state goes in localStorage; IndexedDB, Cache Storage and service-worker state may differ when the tool is embedded in Safari.
- **ADR-0006 (test stack):** the AC11 Playwright test must re-enable `ThirdPartyStoragePartitioning` in Chromium. It must not use Playwright WebKit as the Safari oracle for localStorage.
- **ADR-0007 / ADR-0009 headers:** send `Cache-Control: no-transform` on HTML, or turn off Cloudflare Web Analytics auto-injection for the zone (a user decision). Otherwise Cloudflare adds a third-party script (NFR-05).
