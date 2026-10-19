---
id: MOD-Meta
title: Link previews and site index
status: draft
depends_on: [MOD-Content, MOD-Copy]
---

## Responsibility
MOD-Meta produces each page's head metadata:
- the title (at most 60 characters) and description (at most 160 characters);
- the canonical URL;
- Open Graph tags (`og:title`, `og:description`, `og:image` with width and height, `og:url`, `og:type`, `og:site_name`) and `twitter:card=summary_large_image`;
- the shared preview image, 1200 × 630 (NFR-12, F-015.R1).

Tool pages use the tool's name in COPY-meta.toolTitle and its summary as the description (F-015.R2). The not-found page declares COPY-notFound.title, `noindex`, and nothing about any tool (F-015.R4). It answers at any unknown address, so it declares no canonical URL and no `og:url`. A hidden or unknown tool, and an unknown or empty category, get the not-found metadata.

The shared preview image (`/preview.png`) is generated at build from the dark theme tokens (DEP-17): the logo (accent square with "T" and COPY-shell.brand), COPY-meta.homeDescription, the portal host, and one dot per category tint. `pnpm gen` extracts the text as glyph outlines from the fontsource faces with fonttools (`scripts/preview-glyphs.py`), and sharp (DEP-31) rasterizes the SVG, so the image does not depend on system fonts.

It also generates `sitemap.xml` from the registry (public pages, visible category pages and visible tool addresses, F-015.R3, F-015.R5) and `robots.txt`. A build check fails on titles or descriptions that are too long.

## Not responsible for
- Per-tool preview images (not planned in this scope).
- The Content-Security-Policy and other security headers (MOD-SecurityPolicy).

## Public surface
- `<HeadMeta title description path noindex>`, used by MOD-Shell's `<BaseLayout>`.
- `metaFor(route, registry) → PageMeta` (`{ title, description, path, noindex? }`), which is pure and unit-tested; pages spread it into `<BaseLayout>`.
- `headTags(meta, origin)`: the tags, with the NFR-12 length check (it throws, naming the page).
- `siteIndexXml(registry)` and `robotsTxt(origin)`; `previewSvg(glyphs)` and `previewGlyphRequest(text)`.
- `sitemap.xml.ts`, `robots.txt.ts` and `preview.png.ts` static endpoints.

## Implements
F-015 (all requirements). It is the main owner of NFR-12.
