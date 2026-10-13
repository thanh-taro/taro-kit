# TaroKit — Vision brief (v2)

## One-liner
**TaroKit is Taro's personal home on the web.** It is a fast, keyboard-first portal that launches every tool Taro builds, and a portfolio that shows who builds them.

## Problem
- Everyday utilities live on scattered, ad-heavy sites. Pasting tokens or data into unknown sites feels risky.
- Nothing remembers what you use. There are too many tabs.
- Taro builds tools as **separate projects**. Without a hub they can't be discovered, launched consistently or presented as a body of work.

## Who
- **Taro (primary)**: an experienced developer and daily user. Wants a one-keystroke launch, favorites/recents and a personal home screen.
- **Visitors (secondary)**: peers, recruiters and friends. They want to grasp who Taro is, what Taro has built, and try a tool.

Daily use comes from three things: ⌘K opening a tool in under 1 second, the PWA pinned to the dock, and favorites/recents. Decoration does not bring anyone back.

## Positioning and differentiators
1. **A portal, not a monolith.** Tools are independent projects (any stack) on subdomains of the portal's domain, registered in one typed registry. Each opens embedded in the shell (sandboxed iframe) or as a link. Adding a tool is one registry entry, validated in CI.
2. **Keyboard-first and fast.** A ⌘K palette across tools, projects and pages; favorites and recents; deep links `/t/:id`; an installable PWA whose shell works offline.
3. **Private by default, with personal identity.** No accounts, analytics, ads or tracking; local state with JSON export/import; the portfolio is built into the same home.

## Decisions so far
| ID | Decision |
|---|---|
| D-001 | Web app + PWA |
| D-002 | This repo is the portal/portfolio only; each tool is a separate project |
| D-003 | Local-only storage, with JSON export/import |
| D-005 | No analytics |
| D-006 | Hybrid opening: per-tool `embed` (sandboxed iframe) or `link` |
| D-007 | Typed registry file in this repo |
| D-008 | No runtime contract shared between portal and tools |
| D-009 | Portfolio content: bio + links, projects showcase, now/changelog (no blog) |
| D-010 | Portal on the apex domain, tools on subdomains (same site → one storage partition) |
| D-011 | Lean dashboard home |
| D-012 | Seed the registry with placeholder/hidden entries; add real tools as they are deployed |
| D-013 | Changelog generated from registry dates; Now hand-written, showing "last updated" |

## Non-goals (M-1)
- Building tools in this repo.
- Accounts, sync, a backend, analytics, ads, monetization, a blog, a plugin marketplace.
- A runtime contract or design system shared with tools.
- Multi-language UI. **Assumption:** English only.
- Portal export/import does **not** include tool data; each tool owns its own backup.

## M-1 · Portal + identity
1. **Tool registry** (typed, in repo, validated at build):
   - Fields: id, name, summary, category, keywords, icon, url, mode (embed|link), kind (own|external), sandbox tokens, allow features, offline flag, hidden flag, added/updated dates.
   - Projects use the same content model with `kind: project`, shown in a separate view.
2. **Lean home dashboard**: a compact greeting with date and time, a prominent ⌘K search, favorites, recents, and "what's new" (from registry dates). Sections hide when empty.
3. **Catalog**: browse by category, plus filter and search.
4. **Tool host `/t/:id`**:
   - Embed: a sandboxed iframe with a slim header (name, favorite, open-in-new-tab — always visible), an offline state for tools that aren't offline-capable, and a loading state.
   - Link: open in a new tab and record the recent.
5. **⌘K palette**: tools, projects, pages and actions (theme, export…). Fully keyboard-driven.
6. **Favorites, recents, settings** (theme): local; JSON export/import.
7. **About**: avatar, bio, social and contact links.
8. **Projects showcase**: cards with description, tags, links and image.
9. **Now + changelog**: Now is a dated hand-written entry; the changelog is generated from the registry.
10. **PWA**: installable, with the shell, registry and content available offline; light/dark theme; Open Graph link-preview metadata for visitors.
11. **CI registry check**: schema validation, reachability of URLs, and embed headers that allow the portal (`frame-ancestors`/XFO) for `mode: embed`.

**Done when:** Taro has used TaroKit as the daily launcher for 2 weeks, checked from local recents; and every M-1 acceptance criterion passes.

**M-2 · Polish**: tool detail pages (screenshots, source, version); per-favorite shortcuts; richer widgets; listing third-party tools labelled "external".

**M-3 · Ecosystem**: a tool scaffold template repo; per-tool `/tool.json` manifests fetched at build; optional sync.

## Business and legal
- Personal and non-commercial.
- Original code; don't copy IT-Tools (GPL-3.0). Fonts and icons must be OFL/MIT/ISC.
- The repo license is a legal decision for phase 3 or 6.
- Domain purchase and hosting accounts are **hard stops**, phase 6. The free static hosting tier is enough.

## Risks → spikes (time-boxed)
| ID | Question | Box |
|---|---|---|
| SP-1 | Embedded at the apex vs opened on its subdomain, does a tool see the same localStorage in Chrome, Safari and Firefox? | 3h |
| SP-2 | Does a CI header-check script classify embeddability correctly on 5 good and 5 bad URLs? | 2h |
| SP-3 | With per-tool sandbox/allow settings, do clipboard-write, download and file input work in Chrome and Safari? | 2h |
| SP-4 | Does the installed PWA open `/t/:id` offline, show the offline state, and run an offline-capable embedded tool? | 3h |
| SP-5 | Can one typed registry drive the palette, catalog, changelog and sitemap, with the build failing on an invalid entry? | 2h |

Other risks:
- An embed can't be reliably detected as refused from the parent page. The mitigation is CI header checks plus the always-visible open-in-new-tab button.
- Content rot. The mitigation is showing "last updated" on Now.
