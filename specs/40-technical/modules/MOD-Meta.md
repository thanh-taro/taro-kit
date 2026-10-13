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

Tool pages use the tool's name in COPY-meta.toolTitle and its summary as the description (F-015.R2). The not-found page declares COPY-notFound.title, `noindex`, and nothing about any tool (F-015.R4).

It also generates `sitemap.xml` from the registry (public pages plus visible tool addresses, F-015.R3) and `robots.txt`. A build check fails on titles or descriptions that are too long.

## Not responsible for
- Per-tool preview images (not planned in this scope).
- The Content-Security-Policy and other security headers (MOD-SecurityPolicy).

## Public surface
- `<HeadMeta page>`, used by MOD-Shell.
- `sitemap.xml.ts` and `robots.txt.ts` static endpoints.
- `metaFor(route, registry) → Meta`, which is pure and unit-tested.

## Implements
F-015 (all requirements). It is the main owner of NFR-12.
