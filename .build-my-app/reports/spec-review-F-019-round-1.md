# Spec review: F-019 "Choose a language" (round 1, 2026-10-23)

Lint: `python3 tools/spec_lint.py` reports 609 IDs, 2670 references, 0 errors, 0 warnings.

## Verdicts
| Item | Verdict |
|---|---|
| F-019 | not ready (B1, B2, M1 to M8) |
| RULE-08 / ENT-Preferences / F-013 changes | not ready (B1) |
| INV-09 / model.md "localized text" | not ready (B2, M7, M8) |
| RULE-15 | ready after minor fixes (M1) |
| RULE-16, RULE-05, INV-05, NFR-03, NFR-05 | ready |
| F-004.R5, F-007.R1, F-012 scope/R5 | ready (F-007 depends on M2) |
| CMP-AppShell, CMP-CommandPalette | ready after minor fixes (M4, m2) |
| SCR-Settings, SCR-Policy | ready after minor fixes (m3, M1) |
| copy.md (vi-VN column) | ready after minor fixes (Vietnamese copy list at the end) |
| ADR-0012 (proposed) | not ready (M5, M6, B1 dependency); it has to be accepted before F-019 can be `ready` |
| MOD-Language, MOD-Copy, MOD-ToolHost, platform-mapping, tool-contract | ready after minor fixes (M3, m10, m13) |
| content/privacy.yaml, content/terms.yaml (not specs, but shipped promises) | must change (M9) |

## Blockers

**B1. The stored data and the backup format change, but the schema version, the domain schema and the module surfaces don't.**
- `specs/10-domain/project.schema.json:357-369`: `preferences` has only `theme`, with `additionalProperties: false`. With this schema the language can't be stored, exported or imported, so F-013.AC1 and AC11 can't pass.
- `specs/10-domain/rules.md:19` (RULE-08) keeps "The M-1 schema version is **1**." The shipped v1.2.0 code (`src/modules/personal-data/document.ts` `normalizeDocument`) rebuilds `preferences` from `theme` only and rewrites the stored document whenever the text differs (`store.ts` `read`). An old tab still open after deploy never reloads by itself (CMP-AppShell "update ready"), so it would silently delete the new language choice. A v1.2 portal importing a v1.3 backup would also reject it as "damaged" instead of "newer version".
- `MOD-PersonalData` public surface (`specs/40-technical/modules/MOD-PersonalData.md:26`) and ADR-0010's mutation list (`ADR-0010…:21`) have no set-language command.
- Fix. RULE-08: "The schema version is **2** (version 1 had no language). Migration, for files from an older version or with missing optional parts, fills what is missing with defaults (…; theme system; no language, so it follows the device), then validates. A language other than `en-US` or `vi-VN` makes the file damaged." In the schema, add `"language": { "enum": ["en-US", "vi-VN"] }` to `preferences` with no default, since absent means "follow the device". In MOD-PersonalData, add `setLanguage(lang | null)`; in ADR-0010, add "set language" to the mutations. In F-013, add "AC13 Given a version-1 backup file with theme dark, when the user imports and confirms, then the theme is dark and the language follows the device. (R3)".

**B2. INV-09 has no enforcing requirement or schema.**
- `specs/20-features/F-019-language.md:52` (AC18) expects a build failure naming INV-09, but `specs/20-features/F-001-*.md:26` (R2, which owns content validation) lists only INV-01, 02, 03, 06, 07 and RULE-14. The domain schema still types every text as a plain string (for example `project.schema.json:74-79` tool name/summary, `:540-548` résumé languages). ADR-0012:17 says "the domain schema gains `localizedText` and `name`", but the 10-domain schema, which is the source of truth, wasn't changed. MOD-Content and ADR-0005 (content file format) don't describe the `{ en-US, vi-VN }` maps either.
- Fix. F-001.R2: "…when any content breaks the data schema or INV-01, INV-02, INV-03, INV-06, INV-07, INV-09 or RULE-14." Add `$defs/localizedText` (`{ "en-US": string≥1, "vi-VN": string≥1 }`, both required, no other keys) and `$defs/name` (a string or a localizedText) to `project.schema.json`, and apply them to every field model.md:12 names. Add a note to ADR-0005 with the YAML shape and the error format `file › field › INV-09`. Move AC18 to F-001 (or keep it in F-019 and trace it to F-001.R2).

## Major

**M1. The Vietnamese month format in RULE-15 doesn't match standard Vietnamese, or what the platform produces.**
`specs/10-domain/rules.md:26` gives "tháng 6, 2022". Standard Vietnamese, and `Intl` vi-VN `{month:'long', year:'numeric'}`, is "tháng 6 năm 2022". (The full date "22 tháng 10, 2026" in SCR-Policy:14 *is* correct.) A test written from the rule would fail against the platform output, or code would hand-roll a wrong format. The changelog month groups are headings and need a capital: "Tháng 6 năm 2022".
Fix (RULE-15): "…the full month name and the year in the language showing ("June 2022", "tháng 6 năm 2022"; RULE-16), the same format as the changelog's month groups (which start with a capital letter: "Tháng 6 năm 2022")…". Also give COPY-resume.period an example in its Notes: "tháng 6 năm 2022 – nay".

**M2. F-019.AC7 and AC8 are not testable as written.**
`F-019-language.md:41-42`: "follow Vietnamese conventions" and "reads with the Vietnamese month and year" have no expected values.
Fix. AC8: "Given Vietnamese is showing, when Home opens on Friday 2026-10-23 at 08:00 local time, then the greeting is "Chào buổi sáng", the date reads "Thứ 6, 23 thg 10" and the time reads "8:00"." (This is the vi-VN output of the options MOD-Pages uses today: weekday short, day numeric, month short; hour numeric, minute 2-digit.) AC7: "…then a period from 2022-06 with no end reads "tháng 6 năm 2022 – nay", and the browser's page title is "CV — TaroKit"."

**M3. MOD-Pages still says device locale and English month.**
`specs/40-technical/modules/MOD-Pages.md:42` (clock: "device locale") and `:60` (`period`: "the full English month and year from SCR-Now's `monthLabel`") contradict F-007.R1 and RULE-15 as changed. (Code today: `src/modules/pages/home/inline.ts:50,53` uses `undefined`, `src/modules/pages/now/now.ts:56` uses `'en-US'`.) The clock is an inline pre-hydration script, so it has to read the language from `<html lang>`.
Fix. MOD-Pages:42: "…the local date and time in the language showing (`Intl.DateTimeFormat(document.documentElement.lang, …)`, built anew on each update…)". MOD-Pages:60: "…each month as the full month and year in both languages (`monthLabel(ym, lang)`), rendered through `<L>`…". Add MOD-Pages to the changelog list of changed items.

**M4. The language name can't be marked with its own language inside an attribute-based accessible name.**
`CMP-AppShell.md:24` and `copy.md:28,71` require "Switch to {language}" with `{language}` marked `vi-VN`. AC17 (`F-019-language.md:51`) tests that marking. If the switch is named with `aria-label`, which is how the theme toggle works today, no `lang` can apply to part of the name, so AC17 can't pass.
Fix (CMP-AppShell Behavior): "The language switch's visible text is the other language's name, marked with its language. Its accessible name comes from its content: COPY-shell.languageSwitch with the prefix visually hidden and {language} as the marked visible name (never an attribute-only label)." Do the same for the palette row (CMP-CommandPalette).

**M5. The display face's subset can't draw Vietnamese headings.**
`ADR-0012…:21` says "All three families already ship Vietnamese". But `scripts/subset-fonts.py:25` ships Unbounded headings as ASCII + é only. The VIET range (`:21-22`) has no Latin-1 vowels: à á â ã è ê ì í ò ó ô õ ù ú ý and their capitals. "Công cụ", "Cài đặt" and "Về mình" headings would fall back to another font mid-word. JetBrains Mono is ASCII-only, so any Vietnamese in mono text (key hints) falls back too.
Fix (ADR-0012 Fonts): "The display face's heading subset adds the Latin-1 letters Vietnamese uses (U+00C0–00C3, 00C8–00CA, 00CC–00CD, 00D2–00D5, 00D9–00DA, 00DD and their lower-case forms) to its Latin file, and keeps the Vietnamese file for the rest. `check-dist-fonts` fails when any heading or mono string in either language (copy and content) has a character no shipped subset covers. Mono text stays ASCII in both languages."

**M6. With no script, both languages show at once, and crawlers read both.**
`ADR-0012…:13-14`: CSS hides a version only under `:root[data-lang=…]`, and that attribute is set by the inline script. Without the script running (no-JS, preview scrapers, some crawlers), every text appears twice. MOD-Pages already plans for "a page without scripts".
Fix: "The built HTML has `<html lang="en-US" data-lang="en-US">`, so English shows with no script and for every crawler and preview scraper (R8). The inline script changes them only when the language showing is vi-VN."

**M7. "Levels are not localized" is ambiguous.**
`specs/10-domain/model.md:12`: the résumé language level ("Advanced", F-017.AC6) and the education level are free text, and would stay English in Vietnamese. Skill levels are numbers.
Fix: "Ids, addresses, dates, skill levels (1–5), tints and tags are not localized; an education level and a language's level are localized text."

**M8. Alphabetical order is undefined when a name has two versions.**
F-002.R1, F-016.R3, RULE-04 ("then by name") and RULE-05 ("by name alphabetically") sort by name. `model.md:12` lets a tool's name have two versions, but ADR-0012 renders one DOM order for both languages (code sorts with `'en'` collation, `src/modules/content/derive.ts:48`). A Vietnamese reader could see a list that isn't alphabetical.
Fix (preferred), model.md:12: "A tool's name is always written once and reads the same in both languages." Then remove "a tool's name" from the "may be written once" list and add to INV-09: "A tool's name has exactly one version." Alternative: state in RULE-05 and F-002.R1 "alphabetically by the en-US name, in both languages".

**M9. Policy text must change before release.**
`content/privacy.yaml` (shipped, D-057) contradicts INV-05 as amended:
- `privacy.yaml:17`: add "- your language choice (English or Vietnamese), if you pick one;".
- `privacy.yaml:27`: replace with "The only things the portal passes to it are whether you're using the light or dark theme and whether you're reading in English or Vietnamese, so it can match."
- `privacy.yaml:7` and `terms.yaml:6`: set `updated` to the publish date.
- The governing-language clause of D-063 currently exists only as UI copy shown on the Vietnamese page (COPY-policy.translationNote). Put it in the binding English text: add a section to `terms.yaml` such as "Language: These terms and the privacy policy are written in English. The Vietnamese version is a translation for convenience; if they differ, the English version applies." Have the Owner confirm, since governing law is Vietnam (`terms.yaml:25`) and Vietnamese consumer rules may expect Vietnamese terms to be valid.
- Both Vietnamese policy translations need the Owner's approval, as D-057 did for the English text. Add that as a release gate in F-019 or the roadmap.
- F-018.AC1/AC2 (`F-018-privacy-and-terms.md:32-33`) assume English: prefix "Given English is showing,".

## Minor

- **m1** `F-019-language.md:43`: R5 also covers pages and actions, but no AC tests them. Add "AC19 Given Vietnamese is showing, when the user types "settings" in the palette, then the page Cài đặt is listed. (R5)".
- **m2** `copy.md:71` / CMP-CommandPalette: the action named "Switch to Tiếng Việt" / "Chuyển sang English" isn't found by "language", "ngôn ngữ" or "vietnamese". Add to F-004.R5: "The switch-language action also matches "language", "ngôn ngữ", "English", "Vietnamese" and "Tiếng Việt"."
- **m3** `SCR-Settings.md:15` / `F-019-language.md:26`: once chosen, the language can never follow the device again, except through erase. Either state it ("There is no follow-the-device option once a language is chosen; erase resets it (F-013.R5).") or add an option COPY-language.device "Match my device" / "Theo thiết bị".
- **m4** Edge cases: nothing says what other open windows do. Add "Another open window picks up a language change the next time a page opens in it." or "…at once, as favorites do (F-005)".
- **m5** `F-019-language.md:58` "until the page changes" vs F-012 edge case (`F-012-theme.md:48`) "for the session": use the same wording in both. The F-019 wording is the accurate one.
- **m6** `F-013-backup.md:38` (AC6): add "language" to the list that matches the file. AC12's "fr-FR is damaged" needs the RULE-08 sentence from B1.
- **m7** `F-019-language.md:32` (R8) / RULE-16: also name the installed app's name and description (manifest, `src/modules/offline/manifest.ts:46` `lang: 'en'`) as always en-US.
- **m8** `ADR-0012…:29` / `architecture.md:86-91`: the budget rows (HTML ≤ 20 KB, fonts "at most 2 subsets", catalog data ≤ 10 KB/50) assume English. With Vietnamese showing, Home loads 4 font files (about 43 KB today), and the catalog data carries both languages plus keys. Re-baseline the rows. Add to NFR-11's measure: "…measured with each language showing".
- **m9** `model.md:12` / schema: say whether length limits (policy title ≤ 60, heading ≤ 80, schema `maxLength`) apply to each version. Vietnamese runs longer.
- **m10** `MOD-Language.md:10` says "blocking inline head script"; `platform-mapping.md:72` puts the theme script as the first element of `<body>`. Use one wording.
- **m11** `ADR-0012…:4` is `proposed`. Accept it, with a D-number, before moving F-019 to ready.
- **m12** `ADR-0012…:13`: sibling `[data-l]` elements can't go inside `<option>`, `<title>`, `<textarea>` or `<meta>`. List these as attribute/script-swapped cases. SCR-Settings should use radio buttons for the language choice.
- **m13** tool-contract / ADR-0012:20: say, as ADR-0011 does for the theme, that a frame reloaded on coming back online (F-003.R6) carries the language showing at that moment.
- **m14** `F-019-language.md:26`: R2's "open menus are kept" and R4's "announcements" have no AC. Add: "Given the narrow layout with the menu open, when the user switches language from the menu, then the menu stays open with focus on the switch." and "Given Vietnamese is showing, when the palette returns 3 results, then "3 kết quả" is announced."
- **m15** `F-019-language.md:58`: the storage-unavailable edge case has no AC. Add one mirroring F-012's.
- **m16** Narrow/full header (NFR-07): the header gains a control and Vietnamese nav labels are longer. Add "AC Given Vietnamese is showing, at 320 px and at the narrowest full-layout width, the header fits with no horizontal scrolling. (R4)".

## Vietnamese copy (copy.md)
The overall voice is good: "mình"/"bạn" are used consistently, diacritics are correct, and the old-style tone marks ("Xoá", "Huỷ") are used throughout. Fixes:
- `copy.md:24` COPY-shell.offline: "ngoại tuyến" is stiff and rare in speech. Use "Bạn đang mất mạng. Các công cụ cần internet tạm dừng nhé."
- `copy.md:18` COPY-nav.now "Hiện tại" reads as "present/current" (and COPY-resume.present is "nay"). Use "Dạo này", which matches COPY-now.title and COPY-meta.nowTitle "Dạo này — TaroKit".
- `copy.md:84` COPY-about.nickname "hay gọi là" → "còn gọi là {nickname}".
- `copy.md:145` COPY-settings.privacyTools: "Điều duy nhất … là giao diện và ngôn ngữ" is singular for two things. Use "Mình chỉ cho công cụ trong TaroKit biết hai điều: giao diện và ngôn ngữ bạn đang dùng."
- `copy.md:53` COPY-tool.linkedNote "Mở ở đó nhé." → "Bạn mở ở đó nhé." (keeps the "bạn" address the voice rule asks for).
- `copy.md:150` COPY-policy.translationNote: add a way to read the original: "Đây là bản dịch để bạn tiện đọc. Nếu có chỗ nào khác với bản tiếng Anh, bản tiếng Anh được áp dụng." Consider a link that switches to English.
- `copy.md:10`: the rule says "Vietnamese punctuation", but the rows use straight quotes in "{query}". Either state that straight quotes are used in both languages, or use “{query}” in the vi-VN column.
