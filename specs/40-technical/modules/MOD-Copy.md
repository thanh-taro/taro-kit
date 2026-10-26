---
id: MOD-Copy
title: Message catalog
status: draft
depends_on: []
---

## Responsibility
MOD-Copy generates a typed message catalog from `specs/30-experience/copy.md` at build. It produces one key per COPY ID, each with its en-US and vi-VN text (a missing version fails generation), and handles `{placeholder}` interpolation. Every user-facing string in code comes from here, so copy has one home and a missing or misspelled ID is a type error. It also formats dates and times with `Intl` in the language showing (F-007.R1, RULE-16, ADR-0012).

## Not responsible for
- Choosing or applying the language showing (MOD-Language).
- Content text authored by the Owner (MOD-Content).

## Public surface
- `t(id, params?, lang?) → string`, where `id` is a union of the generated COPY keys and `lang` defaults to the language showing.
- `tBoth(id, params?) → Loc`: both versions, for build-time text rendered through MOD-Language's `<L>`. `params` may be a function of the language, for values that are themselves localized. As built, the language showing is the root's `lang` in a browser and en-US at build (`showingLanguage()`).
- `formatDate(iso, lang, style)`, `formatTime(date, lang)` and `formatMonth(month, lang, capital?)`, which wrap `Intl.DateTimeFormat(lang, …)`. `capital` capitalizes Vietnamese month group labels; résumé periods stay lower case ("tháng 6 năm 2022 – nay").
- A codegen step, `pnpm copy:gen`. CI fails if its output is stale.

## Implements
The copy references in every feature. It supports NFR-03 by giving accessible names one source.
