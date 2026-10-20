---
id: ADR-0002
title: Astro static output with Preact islands, in TypeScript
status: accepted
date: 2026-10-13
supersedes: []
---

## Context
The portal is a static site with no backend (D-001), served from free static hosting (ADR-0007). The forces:
- **Weight.** The home page's initial transfer must stay under 200 KB compressed (NFR-11), and home must render and respond within 1.5 s on the mobile lab profile (NFR-01). Most pages are content (About, Projects, Now, the changelog). Only a few parts are interactive: the palette, favorites, recents, theme, settings and the tool view.
- **Link previews per page.** Every public page and every tool address needs its own title, description and preview image in the HTML that preview crawlers read (NFR-12, F-015.R2). Crawlers don't run scripts, so each tool needs a pre-rendered HTML file.
- **Offline and installable** (F-011, NFR-06). The build output must be a plain set of files that a service worker can precache.
- **Strict CSP.** Inline scripts must be hash-allowed so that frame-src can be locked to catalog origins (NFR-08).
- **Shared on-device state.** Favorites, recents and the theme change in one place and must show everywhere at once (F-005.R1).

## Decision
- Use **Astro 7** (MIT) with `output: "static"` and no adapter. Every route is pre-rendered at build: home, tools, `/t/<id>/` for each visible tool, projects, about, now, settings and the not-found page.
- Interactive parts are **Preact 10 islands** (`@astrojs/preact`). They share state through **@preact/signals** stores in plain TypeScript modules, so the stores are singletons per page.
- Islands hydrate with `client:load` only where first paint needs device data (home lists, the tool view). Everything else uses `client:idle` or `client:visible`.
- A roughly 1 KB inline palette bootstrap catches Mod+K and the search control before the palette island loads.
- Astro's built-in **`security.csp`** emits per-page script and style hashes and the extra directives (ADR-0009). The ClientRouter (view transitions) is not used, because it is incompatible with that CSP. Navigations are full page loads served from the service worker's cache.
- Language: **TypeScript** in strict mode. Pin TypeScript 6.x until `@astrojs/check` supports 7.x. Pin Preact 10.x until `@astrojs/preact` declares support for 11.

## Alternatives considered
- **SvelteKit static** (adapter-static plus prerender). It has a strong built-in service worker hook and CSP hashing, and Svelte output is small. But it hydrates the whole page and ships a client router on every route, which costs home's budget. Its content-page ergonomics are also weaker than Astro's. This is the closest second choice.
- **Vite + Preact or React SPA.** It has the smallest framework footprint, but per-tool link previews need a separate pre-render step, deep links on static hosting need fallback rules, and first paint waits for JS (NFR-01). Too much glue code.
- **SolidStart static.** Its reactivity performs very well, but the ecosystem is smaller and the meta-framework churns more. That's no benefit for a mostly static site.
- **Eleventy + vanilla TS.** Very boring and very light, but the palette, shared state and settings would need hand-built component plumbing.
- **Svelte 5 islands inside Astro.** Equally viable. Preact was chosen for its familiar JSX/TS model, its roughly 4 KB runtime, and signals that work across islands. Switching to Svelte would only change the islands, not the architecture.

## Consequences
- Pages ship no JS by default. Home's JS is the island runtime, Preact plus signals, and the home islands (budget in `architecture.md`).
- Islands get catalog data from a hashed JSON file emitted at build (MOD-Content), not from inlined props. This avoids duplicating the catalog in every page.
- Values relative to the current date (what's new, the stale Now label, greeting, time) are computed in the browser, never at build time (rules.md preamble).
- Adding an island means checking it against the home budget in CI (ADR-0006).
- Astro is MIT and stewarded by Cloudflare since January 2026. The license and the multi-host stance are unchanged. Nothing in this design depends on Cloudflare-specific Astro features.

## Amendments from spike SP-6 (2026-10-13)
- The palette island hydrates `client:idle`. A tiny inline bootstrap plus a static `<dialog>` catches the shortcut before hydration (open in 25–53 ms; results within about 0.5 s on the reference profile). The catalog index is prefetched on hydrate.
- Astro's CSP does not hash `is:inline` scripts, and hashes added after `<head>` are dropped. Inline scripts are therefore hashed in the layout frontmatter (see ADR-0009).

## Amendment D-055 (2026-10-20)
- The projects page is no longer a route (the projects showcase is deprecated); `/projects/` serves the not-found page. The rest of this decision is unchanged.
