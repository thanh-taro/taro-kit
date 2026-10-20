# TaroKit v1.0.0 (M-1): Portal and identity

Draft for the GitHub Release and, if you like, the Now page. First person, Taro's voice (PRN-04). Edit the bracketed parts on release day; the tool list depends on what is live.

## What's new

Hi, I'm Taro. TaroKit is the home for the tools I build, and v1.0 is the first version I'm sharing.

**Find a tool fast.**
- Press Cmd+K (Ctrl+K on Windows and Linux), or tap the search button, to open the command palette. It searches tools, projects and pages, and it can run a few actions too, like exporting a backup file.
- The catalog lists everything, grouped by category, with a filter field. Each category has its own page with a short intro from me.
- Every tool has a stable address, so you can bookmark it and it keeps working.

**Open tools without leaving.**
- Most of my tools open embedded in the tool view, in a sandbox that keeps them apart from the portal. If a tool can't be embedded, or I made it open in its own tab, it is linked instead.
- If a tool is slow, offline or refuses to load, I tell you plainly and offer the next best thing, like opening it in a new tab.
- [Today's tool: JSON Formatter. Format, minify and validate JSON with exact error positions, entirely in your browser.]

**Make it yours.**
- Pin favorites, and the recents list shows what you opened lately. The home page greets you and puts both up front, plus what's new.
- Choose light, dark or follow your system. Embedded tools get the same theme.
- Everything personal lives in your browser. You can export it as a backup file, import it somewhere else, or erase it, all from Settings.

**Take it with you.**
- Install TaroKit as an app and it works offline: the portal's pages open without a network, and the app tells you when you're offline and when a new version is ready.
- Links to TaroKit show a proper preview with a title, a description and an image in chats and social posts.

**Who I am and what I'm up to.**
- About has my profile and links, Projects shows what else I've built, and Now says what I'm focused on, with its date so you can tell if it's stale.
- The changelog lists tools as I add or update them.

## Privacy

No accounts, no tracking, no cookies, no analytics. Your favorites, recents, days used and theme stay in your browser and only leave it if you export a backup file. Each tool is its own site with its own privacy policy, and the only thing I tell a tool inside TaroKit is which theme you're using. Cloudflare hosts TaroKit and, like any host, handles request data such as your IP address to serve it. I don't use its analytics.

## Good to know

- Safari keeps an embedded tool's saved data apart from the same tool opened in its own tab. In other browsers they share it. I explain it where it matters.
- The clipboard restriction for tools without the clipboard permission can only be enforced in Chromium browsers. Safari and Firefox allow clipboard writes after a click.
- Keyboard-first: every page works with the keyboard, has a skip link, respects reduced motion and forced colors, and fits from 320 px wide.
- Supported: the two latest versions of Chrome-based browsers, Firefox and Safari, on desktop and phone.

## Technical summary

- **Release:** v1.0.0, milestone M-1, 16 features (F-001 to F-016) shipped; 129 of 129 acceptance criteria have tests.
- **Build:** static Astro 7 site with small Preact islands, plain CSS from generated tokens, YAML content validated against a domain schema at build time. No server code.
- **Hosting:** Cloudflare Workers static assets (assets only, no Worker script) on the apex `tarokit.app`; tools run as separate projects on `<tool>.tarokit.app` (ADR-0001, ADR-0007). Security headers (frame-ancestors, Permissions-Policy, HSTS, nosniff, COOP, per-page CSP with hashes) are generated into `_headers` (ADR-0009).
- **Offline:** Workbox precache-first service worker on the portal origin only, install manifest, update prompt (ADR-0004).
- **Storage:** one localStorage document, validated on read (ADR-0010). Backup format v1.
- **Delivery:** GitHub Actions: `ci.yml` on pull requests, `publish.yml` on `main` with the catalog check as a blocking gate, and a weekly catalog check (Mondays 03:17 UTC) that never deploys.
- **Quality at G5:** unit 449/449, Chromium e2e 310/310, WebKit 279/279, spec lint 0 errors, token contrast 0 failing pairs, axe 0 serious on all pages, `pnpm audit` clean, licenses approved (747 packages, 6 registered build or dev exceptions), no critical, high or medium security findings.
- **Performance (mobile profile, 4x CPU, 9 Mbps, 170 ms RTT):** first view cold 0.45 to 0.62 s (target 1.5 s), warm 0.05 to 0.07 s (0.5 s), keystroke p95 23 to 39 ms (50 ms), home weight about 96 KB brotli (200 KB), CLS 0 on mobile.
- **Dependencies:** 17 runtime packages, all permissively licensed; fonts under the OFL, subset to 50.5 KB; notices at `/third-party-notices.txt`.
- **Known limitations:** Safari partitions embedded storage (D-038); the clipboard restriction holds only in Chromium (F-003.AC3); the offline copy grows by about 35 KB per tool page, so a shared tool page is planned for M-2 before the catalog gets large.
- **Not done yet (M-2 candidates):** tool detail pages, reordering favorites, an "external" label on third-party tools, richer home widgets, a per-tool preview image.
