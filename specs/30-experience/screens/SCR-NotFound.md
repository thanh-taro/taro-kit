---
id: SCR-NotFound
title: Not found
status: draft
features: [F-003]
components: [CMP-AppShell, CMP-StateMessage]
---

## Purpose
Recover from a bad or outdated address.

## Layout regions
1. Shell header.
2. CMP-StateMessage with COPY-notFound.title, COPY-notFound.body and a link to the catalog (COPY-notFound.toCatalog).

## States
| State | When | What the user sees |
|---|---|---|
| default | unknown address | message |
| empty | n/a | — |
| loading | n/a | — |
| error | n/a | — |

## Entry & exit
- Entered from: any bad address.
- Exits to: SCR-Catalog, SCR-Home.

## Accessibility
The page title states that the page was not found.
