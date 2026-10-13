---
id: ADR-0001
title: Tools live on subdomains of the portal's site
status: proposed
date: 2026-10-13
supersedes: []
---

## Context
Tools are separate projects. Embedded tools run isolated inside the portal (F-003.R3). Browsers partition an embedded page's storage by the top-level site, and some evict storage of pages that are only ever seen embedded. If a tool lives on an unrelated site, the same tool would keep two separate sets of data, one embedded and one opened directly, which breaks F-003.R8. The user chose this layout in phase 1 (decision D-010).

## Decision
The portal is served from the apex domain, and each own tool is served from a subdomain of that same site. Each own embedded tool allows the portal's site to embed it.

## Alternatives considered
- Unrelated hosts (for example free hosting subdomains of different sites): zero setup, but storage would be split and could be evicted.
- Same origin with path-based routing: storage is seamless, but every tool's deploy would be coupled to the portal's hosting, against PRN-01.

## Consequences
- The domain is `tarokit.app` (D-025): the portal is at `https://tarokit.app` and tools at `https://<tool>.tarokit.app`. `.app` is on the browser HTTPS-only preload list, which matches INV-02.
- A custom domain is required (a money and account hard stop, phase 6).
- Spike SP-1 must confirm shared storage across the supported browser engines before this ADR is accepted.
- F-014 checks that each embedded tool allows the portal's site.
