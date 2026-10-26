# Security and privacy audit — F-019 "Choose a language"

Scope: `git diff 59e5a3b..HEAD` (101 source/content files, tests excluded from findings). Read against ADR-0012, ADR-0011 (+note), ADR-0009, ADR-0010 (+note), INV-05, NFR-05, `specs/40-technical/tool-contract.md` and `content/privacy.yaml`. Built output in `dist/` was checked too (built 09:06; HEAD 569162a is from 09:09 and changes only catalog tags, so the CSP result still holds. Re-run after the release build).

**Result: 0 critical, 0 high, 0 medium, 2 low, 5 info.**

## Checks that passed

| Area | Result | Where |
|---|---|---|
| postMessage target | Both `taro:theme` and `taro:language` go to `secureOrigin(toolUrl)`. `"*"` is never used. | `src/modules/tool-host/theme-handoff.ts:111-118` |
| Ready message checks | It is answered only when `event.origin === toolOrigin` and `event.source === frame.contentWindow`. Anything else is ignored. Only `taro:ready` gets a reply. | `theme-handoff.ts:121-129` |
| What reaches tools | Only `theme` and `lang` are added to the frame `src`, each checked against its allowed values (`assertHandoffTheme` / `assertHandoffLanguage`). Messages carry only `{type, value}`. | `theme-handoff.ts:47-87` |
| Linked tools and new tab | The new-tab link and linked tools use the catalog URL as it is (`openHref={tool.url}`). `open-tool.ts` is unchanged. | `src/modules/tool-host/ToolFrame.tsx:105`, `ToolView.astro:57` |
| Unit tests | AC11/12/13 test the right origin, a ready message from another origin or window getting nothing, and theme and language being tracked separately. | `tests/unit/theme-handoff.test.ts:83-249` |
| Pre-paint script and CSP | It is one script, hashed with `insertScriptHash(inlineScriptHash(themeInlineScript))`. In `dist/`, all 83 inline scripts match a hash in their page's CSP. There is no `unsafe-inline`, `unsafe-eval` or `unsafe-hashes`, and no new script, style or connect sources. The built script has no `__name` helper or `innerHTML`. | `src/modules/shell/BaseLayout.astro:49,79`, `src/modules/theme/inline.ts:11-17` |
| Title and attributes | `document.title = getAttribute('data-l-<lang>')` and `setAttribute` only. Home scripts use `textContent` and `createElement`. Config JSON in inline scripts escapes `<`. | `src/modules/language/index.ts:44-51`, `language/inline.ts:29-32`, `pages/home/inline.ts:20,56,173` |
| HTML sinks | New `dangerouslySetInnerHTML` only on build-time SVG icons (`LanguageSwitch.tsx:29`, `Palette.tsx:374`). `Each.astro:19` uses `set:html` on Astro's own escaped slot output. No content strings reach HTML sinks. | — |
| Policy links in both languages | `policyLinkErrors` and `policyMixedLists` check each language's body separately and fail the build on non-https or non-mailto links in vi-VN too. The fixture `INV09-policy-vi-link` covers this. | `src/modules/content/policy.ts:51-52,145-180`, `registry.ts:376-425` |
| Backup import v2 | `migrate` + `normalizeDocument` rebuild the data from known fields only, and the file is valid only if normalizing changes nothing (`same`). So an invalid language (`"fr"`, `null`), unknown fields and `__proto__` / `constructor` keys all result in `damaged`. A `schemaVersion` above 2 gives `newerVersion`. A v1 file with no language imports with no choice. | `src/modules/backup/import.ts:42-96`, `personal-data/document.ts:63-95` |
| localStorage | Same single key `tarokit.personal`. `preferences.language` is stored only when the user picks a language, removed by `setLanguage(null)` and by erase. The pre-paint reader is wrapped in try/catch and only allows the two values. There is no new key, no sessionStorage or IndexedDB, and no logging. | `personal-data/store.ts:244-249`, `read-stored-theme.ts:18-27` |
| Network, cookies, third parties | No new `fetch`, beacon or cookie code, and no new dependency. In `dist/` the only absolute-URL resources are `rel=canonical`. External links are `<a>` elements with `noopener`. `og:locale` and the manifest use fixed values. | — |
| Privacy text vs behavior | In both languages, en-US and vi-VN say the same things: the language is stored only if the user picked one, and the only things passed to an embedded tool are the theme and language. Matches INV-05 (amended), `COPY-settings.privacy`, `privacyTools` and `importConfirm`. The Terms "Language" section says the English text applies (D-063). | `content/privacy.yaml:29,39,52,58`, `src/generated/copy.ts:130,135,138` |

## Findings

### L-1 (Low): the attribute swap writes any attribute named in `data-l-a`
- **Where:** `src/modules/language/attrs.ts:39-54` (also inlined into the pre-paint script and run by its MutationObserver, `language/inline.ts:34-40`).
- **Scenario:** `swapLocalizedAttributes` copies `data-l-<name>-<lang>` into whatever attribute `<name>` the element lists. If markup were ever injected (a future `set:html` mistake, or a content field rendered as HTML), `data-l-a="href" data-l-href-vi-VN="javascript:…"` or `data-l-a="onclick"` would be turned into live attributes, including by the pre-paint observer while the page is still parsing. Today the CSP blocks inline handlers and `javascript:` URLs, and all `data-l-a` values come from code (`aria-label`, `placeholder`, `alt`, `title`; in `dist/` only `aria-label` and `placeholder` appear), so this can't be exploited now. It is defense in depth.
- **Fix:** allow only `aria-label`, `placeholder`, `alt` and `title` in `one()` (a one-line `/^(aria-label|placeholder|alt|title)$/` test, safe to inline). Also make `localizedAttrs` accept only those names.

### L-2 (Low, robustness): one exception in the theme part stops the language part
- **Where:** `src/modules/theme/inline.ts:11-17`.
- **Scenario:** the theme IIFE and `languageMain` are two statements in one script. If the theme part throws (for example an old engine without `NodeList.prototype.forEach`, or `matchMedia` missing in a locked-down WebView), the language part never runs. Vietnamese users then see English at first paint until the module script runs (F-019.R3). This is not a data risk.
- **Fix:** wrap the theme IIFE body in `try{…}catch(e){}`, or use a plain `for` loop instead of `forEach`. The hash is recomputed automatically.

### Info
- **I-1:** `?lang=` is visible in the tool's request URL, its host's request logs and the tool's own `document.location`. This is the accepted INV-05 exception (ADR-0011/0012, D-039). When the user has not picked a language, the value comes from `navigator.languages`, which the tool can read itself, so nothing new is exposed. The tool contract already asks tools to use `ignoreSearch`.
- **I-2:** importing a backup that has no `preferences.language` (any v1 file) removes a stored language choice, so the language follows the device again. `COPY-settings.importConfirm` already says the language is replaced, so this is correct. Note it in the F-013 docs if it isn't there yet.
- **I-3:** `COPY-storage.unavailable` (`src/generated/copy.ts:153`) names only favorites and recents. With storage blocked, theme and language choices also last only for the page (F-019.AC22). This is a wording nit, not a privacy issue.
- **I-4:** `Each.astro:19` (`set:html={parts[i]}`) is safe only because slot children are Astro expressions, which Astro escapes. Keep the existing rule: no `set:html` with content data inside `<Each>` slots.
- **I-5:** re-run the CSP hash check (every inline `<script>` body hashed into its page's CSP) on the final release build. The check script used for this audit is not part of the repo; consider adding it to `pnpm size:check` or the build gate.

## Data for store and privacy declarations (unchanged in kind; one new field)
- **Collected by the developer:** none. No accounts, analytics, ads, trackers or cookies.
- **Stored only on the device (localStorage `tarokit.personal`):** favorites, recents, theme choice, **language choice (new, only if picked)**, last 60 days used. It leaves the device only in a backup file the user exports.
- **Read but not stored:** `navigator.languages` (to pick the language when none is chosen) and `prefers-color-scheme`.
- **Shared with embedded own tools:** the theme showing (light/dark) and **the language showing (en-US/vi-VN, new)**, through the frame URL and postMessage to the tool's exact origin.
- **Processed by the host (Cloudflare):** IP address and basic browser details per request, to deliver pages and protect the sites. Visitor analytics and logs are off.
- **Store labels (if packaged):** "Data not collected". No tracking. No third-party SDKs.
