# Spike SP-3 — Per-tool permissions in Chrome and Safari (2 h)

- Question, experiment and pass bar: specs/40-technical/spikes.md § SP-3.
- Time box: shared 5 h with SP-1. Code: `spikes/sp1-sp3/` on branch `spike/sp1-sp3`.
  - `src/frame-attributes.mjs`: the `frameAttributesFor()` and `permissionsPolicyFor()` prototypes.
  - `build.mjs`: generates the portal pages and `_headers`.
  - `tool/public/caps.*`: the capabilities page.
  - `tests/sp3.mjs`: the matrix runner.
- Lab hosts (D-033): `https://lab.tarokit.app/perms` and `https://labtool.tarokit.app/caps`. Same rig as SP-1.
- Note: this framing file was recreated from the brief (only the template `spike-.md` existed).

## SP-3 result

**Verdict: ADAPT.** The ADR-0009 mapping works on Chromium once one header bug is fixed. Every granted capability works, every capability not granted is refused, and the baseline frame refuses clipboard-write, so F-003.AC3 passes on Chromium. The bug: the Permissions-Policy allowlist must include `self`. With ADR-0009's form, `camera=("https://tool")`, Chromium disables the feature in the portal itself, and so never delegates it, **even to granted frames**. WebKit confirms U-2: clipboard-write cannot be withheld there.

### Evidence: Chromium column (live portal `/perms`, Chromium 141 and Google Chrome 155 identical; user permissions pre-granted, fake media)

Diagonal = the frame's own permission. "denied" is `NotAllowedError` or `TypeError: Disallowed by permissions policy`.

| Frame (permission) | clip-write | clip-read | download | file input | popup | fullscreen | camera | mic | alert | JS-handled submit | navigating submit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline (none) | denied | denied | blocked | **ok** | blocked | denied | denied | denied | blocked | ok | ok |
| clipboard-read | denied | **ok** | blocked | ok | blocked | denied | denied | denied | blocked | ok | ok |
| clipboard-write | **ok** | denied | blocked | ok | blocked | denied | denied | denied | blocked | ok | ok |
| downloads | denied | denied | **ok** | ok | blocked | denied | denied | denied | blocked | ok | ok |
| file-pick | denied | denied | blocked | **ok** | blocked | denied | denied | denied | blocked | ok | ok |
| popups | denied | denied | blocked | ok | **ok, but `window.open` returns null** | denied | denied | denied | blocked | ok | ok |
| fullscreen | denied | denied | blocked | ok | blocked | **ok** | denied | denied | blocked | ok | ok |
| camera | denied | denied | blocked | ok | blocked | denied | **ok** | denied | blocked | ok | ok |
| microphone | denied | denied | blocked | ok | blocked | denied | denied | **ok** | blocked | ok | ok |
| no-forms (sandbox without `allow-forms`) | denied | denied | blocked | ok | blocked | denied | denied | denied | blocked | **no submit event** | **blocked** |

Header variants on the same frames (Chromium 141):

| Portal `Permissions-Policy` | Granted clipboard, fullscreen, camera and mic frames |
|---|---|
| `feature=(self "https://labtool.tarokit.app")` (fixed generator), `/perms` | all work (table above) |
| `feature=("https://labtool.tarokit.app")` (ADR-0009 as written), `/perms-noself` | **all denied**; the portal's own `allowsFeature()` is false |
| `feature=()`, `/perms-off` | all denied (the header gates delegation, as intended) |

Without a user-level grant (`chromium-nogrant`), headless Chromium refused clipboard-write even in the granted frame ("Write permission denied"). This is a headless permission state. Desktop Chrome grants clipboard-write to a focused page on a user gesture, so it is checked by hand below.

### Evidence: without delegation (WebKit 26 via Playwright, `/perms`, no user grants)

| Capability | Result in WebKit |
|---|---|
| clipboard-write | **ok in every frame, including baseline** (not gated, U-2 confirmed) |
| clipboard-read | denied in every frame (needs a user prompt, so a hand check) |
| fullscreen | gated correctly: granted frame ok, others `TypeError: … disabled by permissions policy` |
| popups | gated correctly; `window.open` returns null here too |
| camera / microphone | other frames are refused at once. The granted frames wait at a permission prompt (hand check). |
| downloads | no download event even in the `downloads` frame. Playwright WebKit may not surface blob downloads, so this is a hand check. |
| file input | ok everywhere (cannot be withheld) |
| alert | blocked everywhere |
| no-forms | a JS-handled submit **does fire** without `allow-forms`, and a navigating submit is blocked |

**Firefox:** not measured. Playwright Firefox 142 was killed with SIGTERM at launch on every SP-3 attempt in this sandbox. Run: `cd spikes/sp1-sp3 && npm install && node tests/sp3.mjs firefox perms`.

Raw JSON is in `spikes/sp1-sp3/results/sp3-*.json`.

### What surprised us
1. The `self` requirement above. It is a real bug in ADR-0009 and in the planned MOD-SecurityPolicy generator.
2. **`window.open` returns null in a granted popups frame** in both engines, although the popup does open. The portal sends `Cross-Origin-Opener-Policy: same-origin`, so the tool loses the handle and `opener`. Tools that drive their popup (for example OAuth popups using `postMessage` to the opener) will not work embedded.
3. **Without `allow-forms`, Chromium never fires the `submit` event**, so even Enter-to-submit handled in JS breaks. WebKit still fires it.
4. Cloudflare Web Analytics auto-injection (see the SP-1 report) would also have put a third-party script inside the tool frames.

### Manual checklist (Safari macOS and iOS, plus the Chrome rows that headless can't settle)
Open `https://lab.tarokit.app/perms`. The table at the top fills in as you press buttons inside each frame. For each frame, press every button and record the result. "ok" for the frame's own permission and refused elsewhere is the pass.
1. **Safari macOS:**
   - clipboard write in **baseline** (expect ok, which means not gated);
   - clipboard read in **clipboard-read** (allow the paste prompt) and in baseline;
   - download in **downloads** and in baseline (watch the Downloads list);
   - file pick in baseline;
   - popup in **popups** and baseline;
   - fullscreen in **fullscreen** and baseline;
   - camera and mic in their frames (allow the prompt) and in baseline;
   - both form buttons in **no-forms**.
2. **Safari iOS:** the same list. On iOS, downloads open the "Download?" sheet, and fullscreen applies to video only. Record what happens.
3. **Chrome desktop (not headless):** clipboard write in clipboard-write and in baseline, with no prior grant. Download in downloads (check that no prompt blocks it).
4. **Chrome Android:** the same list as 1.
5. Optional: repeat 1 on `/perms-noself` to see whether WebKit also needs `self`.

### Proposed spec and ADR edits (for the user to approve)
- **ADR-0009, response headers:** the generator emits `feature=(self "<origin>" …)` for each feature some tool declares, and `feature=()` otherwise. Add a unit test that every non-empty allowlist starts with `self`.
- **ADR-0009, permission table:** add per-engine columns.

  | Permission | Chromium | WebKit | Firefox |
  |---|---|---|---|
  | clipboard-read | enforced | prompt-based | pending |
  | clipboard-write | enforced | **cannot be withheld** | pending |
  | downloads | enforced | hand check | pending |
  | file-pick | **cannot be withheld** | **cannot be withheld** | pending |
  | popups | enforced; the opener handle is null under the portal's COOP | enforced; null handle | pending |
  | fullscreen | enforced | enforced | pending |
  | camera | enforced | enforced | pending |
  | microphone | enforced | enforced | pending |
- **ADR-0009, consequence:** popups open, but the tool gets no window handle or opener (COOP `same-origin`). Tools that need their opener must be `linked`. The alternative, `same-origin-allow-popups` on tool pages only, is a separate decision.
- **RULE-10:** keep the current text ("enforced where the browser can restrict them"). It already covers U-2. Add one clarifying clause: "Submitting its own forms is always allowed." This confirms that **`allow-forms` stays** in the base sandbox (U-3 closed). Without it, Chromium suppresses the submit event itself.
- **F-003.AC3:** add "on engines that can restrict clipboard writes (Chromium-based). Elsewhere the attempt is documented as allowed."
- **ADR-0006:** the Chromium column (`tests/sp3.mjs chromium perms`) becomes the F-003.AC3 regression test, with the clipboard and media permissions pre-granted, so that only the policy is under test.
