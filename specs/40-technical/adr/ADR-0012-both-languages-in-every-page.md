---
id: ADR-0012
title: Both languages in every page, chosen before first paint, handed to tools like the theme
status: accepted
date: 2026-10-23
supersedes: []
---

## Context
F-019 adds Vietnamese next to English. The switch must be instant, with no reload and no lost state (F-019.R2), the first paint must already be in the stored language (F-019.R3), every page keeps one address (D-062), and the portal stays offline-capable and cookie-free (NFR-05, NFR-06). The site is pre-rendered static HTML with Preact islands (ADR-0002): the host cannot pick a language per request, because the portal sets no cookies and the preference lives in local storage (ADR-0010). Embedded tools must learn the language the way they learn the theme (ADR-0011).

## Decision
- **Both languages in the HTML.** Every localized text is rendered twice at build, as sibling elements marked `lang="en-US" data-l` and `lang="vi-VN" data-l`, through one `<L>` helper used by Astro pages and islands alike. CSS hides the version that is not showing: `:root[data-lang="en-US"] [data-l][lang="vi-VN"], :root[data-lang="vi-VN"] [data-l][lang="en-US"] { display: none }`. Hidden text is out of the accessibility tree. Text that is the same in both languages (names, INV-09) is rendered once with no `lang` of its own, so it inherits the language showing. Elements that can't hold child elements (`<title>`, `<option>`, `<textarea>`, `<meta>`, attribute values) are swapped by script instead; controls with choices use radio buttons, not `<select>`.
- **No-script default.** The built HTML has `<html lang="en-US" data-lang="en-US">`, so English shows with no script and for every crawler and preview scraper (F-019.R8). The inline script changes them only when vi-VN is showing.
- **Before first paint.** The theme's blocking inline script, the first element of `<body>` (ADR-0011, MOD-Theme), also resolves the language (stored choice, else RULE-16 from `navigator.languages`) and sets `lang` and `data-lang` on `<html>`, and `document.title` from the page's two titles. One script, one CSP hash.
- **Switching.** MOD-Language exposes a `shownLanguage` signal. Changing it sets the two root attributes (CSS swaps every text node at once, so DOM, focus, scroll and typed text are untouched), updates `document.title`, and re-renders only what islands compute: attributes (`aria-label`, `placeholder`, `alt`, `title`), announcements and runtime dates. Static (non-island) elements that carry a localized attribute hold both values (`data-l-<attr>-vi-VN` beside the en-US attribute); one delegated function swaps them at load and on every change.
- **Dates and times** come from `Intl.DateTimeFormat(shownLanguage, …)`. Build-time dates (policy, résumé, changelog months) are rendered in both languages like any text.
- **Copy and content.** `copy.md` holds both columns; the generated catalog is `t(id, params?, lang?)`. Content files hold localized text as `{ en-US, vi-VN }` maps; names may be a plain string or a map; a tool's name, the profile name and nickname are plain strings (INV-09). The domain schema (`project.schema.json`) types each field accordingly, and MOD-Content reports a missing version as `file › entry › field › INV-09` (F-001.R2, ADR-0005 note).
- **Sorting.** Lists sorted by name use the one-version tool name, so the order is the same in both languages.
- **Search.** The catalog data file carries both languages' names, summaries and tags, and pre-normalized keys for both (RULE-05). Pages and actions are matched by their two COPY versions.
- **Link previews and the site index** use en-US only (F-019.R8); `og:locale` is `en_US`.
- **Personal data.** `preferences.language` is stored in the one document (ADR-0010 note); the schema version becomes 2 (RULE-08).
- **Tool handoff** extends ADR-0011 unchanged in shape: the frame `src` carries `lang=en-US|vi-VN` beside `theme`; every change of `shownLanguage` posts `{ type: "taro:language", value }` to the tool's exact origin; a valid `taro:ready` is answered with both `taro:theme` and `taro:language`. Origin and source checks are the same. A frame reloaded on coming back online (F-003.R6) carries the language showing at that moment.
- **Fonts.** The three families' source packages include Vietnamese (DEP registry), but the shipped subsets do not fully cover it: the display face's heading subset is ASCII plus é. The build-time subsetting of ADR-0003 (SP-6) adds the Latin-1 letters Vietnamese uses (U+00C0–00C3, 00C8–00CA, 00CC–00CD, 00D2–00D5, 00D9–00DA, 00DD and their lower-case forms) to the display face's Latin file and keeps the Vietnamese file for the rest. `check-dist-fonts` fails when any heading or mono string in either language (copy and content) has a character no shipped subset covers. Text set in the mono face that holds words (dates and periods) uses the body face when vi-VN is showing (`:root[data-lang="vi-VN"]` rule on those elements), so the mono subset stays ASCII-only and costs no bytes.

## Alternatives considered
- **Separate addresses per language (`/vi/…`)** — best for Vietnamese search results and shared links, but switching is a navigation, which breaks "no reload" (D-062), and doubles the page count in the precache.
- **English HTML, Vietnamese swapped in by script** — keeps HTML small, but Vietnamese visitors see English until the script runs (fails F-019.R3), and every static text node would need a key and a runtime lookup.
- **A message bundle loaded per language** — same first-paint problem, plus a network fetch on switch that must also work offline.

## Consequences
- Every page's HTML grows by the size of its Vietnamese text: an estimated 25–40 % more compressed HTML on text-heavy pages (Résumé, Privacy, Terms) and about 3–5 KB on Home. Home stays far under NFR-11 (94.2 KB of 200 KB at v1.0.0); the architecture's HTML line item is raised to 26 KB.
- `pnpm size:check` and `check-dist-fonts` cover the new glyphs; the size check runs with Vietnamese content.
- Every component must use `<L>` or `t()` for text, never a raw string; a lint check flags literal text in components.
- Unit tests cover RULE-16 resolution; e2e covers the first paint in each language, a switch with state kept, the tool handoff from a stub tool on a second origin, and axe in both languages (NFR-03).
- The tool contract gains the `lang` parameter and the `taro:language` message (`tool-contract.md`).
