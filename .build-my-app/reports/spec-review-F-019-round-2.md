# Spec review: F-019 "Choose a language" (round 2, 2026-10-23)

Lint: `python3 tools/spec_lint.py` reports 617 IDs, 2750 references, 0 errors, 0 warnings. `project.schema.json` parses as valid JSON.
ADR-0012 stays `proposed` until the Owner's approval step, as instructed; that is not counted.

## Round-1 items
| # | Status |
|---|---|
| B1 schema version / preferences.language | Resolved in RULE-08, the schema, ADR-0010 note and MOD-PersonalData. The ADR-0010 note's claim holds for the shipped v1 code (`store.ts`: `newerOnDisk` blocks the rewrite). **But MOD-Backup was not updated, see R2-M1.** |
| B2 INV-09 enforcement | Resolved: F-001.R2, the schema types, the ADR-0005 note. R2-m3 and R2-m4 are follow-ups. |
| M1 Vietnamese month format | Resolved (RULE-15) |
| M2 AC7/AC8 testable | Resolved. The AC8 strings match `Intl` vi-VN output ("Thứ 6, 23 thg 10", "8:00"). |
| M3 MOD-Pages | Resolved |
| M4 marked accessible name | Resolved (CMP-AppShell, CMP-CommandPalette) |
| M5 fonts | Display face resolved. **The mono statement is wrong, see R2-M2.** |
| M6 no-script default | Resolved (ADR-0012, MOD-Language, F-019.R8/AC15) |
| M7 levels | Resolved (model.md, schema) |
| M8 sorting | Resolved: one-version tool name (model.md, INV-09, ADR-0012 "Sorting") |
| M9 policy text | Resolved as a plan in `translation-vi-draft.md` (content changes during build, Owner approval in the F-019 edge cases). F-018.AC1/AC2 fixed. |
| m1–m16 | All resolved (AC19–AC24, F-004.R5 keywords, COPY-language.device, edge cases, F-012 wording, F-013.AC6, manifest, budgets, radio buttons, frame reload). m11 not counted. |
| Vietnamese copy fixes | All applied |

F-013 AC numbering is AC1–AC13, contiguous. F-019 is AC1–AC24, contiguous, and every requirement has an AC.

Existing content against the new schema: every localized field in `content/*.yaml` is a plain string today, so the build fails until the content migration lands. That is expected, since content changes during build. The tool names, profile name and nickname stay plain strings and still validate. Every field the draft covers maps to a schema field. The draft fails four limits (R2-M3).

## Verdicts
| Item | Verdict |
|---|---|
| F-019 | ready after the major fixes below (ADR-0012 acceptance pending) |
| RULE-08 / schema / F-013 | ready after R2-M1 |
| ADR-0012 | ready for approval after R2-M2 and R2-m1 |
| translation-vi-draft.md | not ready: R2-M3 (fails schema limits), plus the language notes |
| Everything else changed this round | ready |

## Blockers
None.

## Major

**R2-M1. MOD-Backup still treats schema version 2 as "newer".**
`specs/40-technical/modules/MOD-Backup.md:13`: "A schema version above 1: newer version". With RULE-08 now at version 2, the portal would reject its own exports (F-013.AC1/AC6 fail).
Fix: "A schema version above the current one (`SCHEMA_VERSION`, 2; RULE-08): newer version (checked before anything else in `data`)." Also add to MOD-Backup:16: "…unknown fields in entries and preferences, and a `preferences.language` other than `en-US` or `vi-VN`, are damaged (F-013.AC12)."

**R2-M2. Mono text is not ASCII in Vietnamese.**
`ADR-0012…:24` says "Mono text stays ASCII in both languages". But style.md:21 sets the mono face for "dates, counts and ids", and the code uses it for the policy date (`PolicyView.astro:69`), the résumé period (`ResumeView.astro:304`) and the Now date (`NowView.astro:116`). In Vietnamese these read "Cập nhật lần cuối 22 tháng 10, 2026", "tháng 6 năm 2022 – nay" and "Thứ 6…". The mono subset is ASCII only (`scripts/subset-fonts.py:38`), so these lines would fall back to another font, or the new `check-dist-fonts` rule would fail the build.
Fix (ADR-0012 Fonts), pick one:
- (a) "The mono face also ships its Vietnamese subset (`jetbrains-mono-vietnamese`, VIET range) and the Latin-1 Vietnamese letters, loaded only when Vietnamese text in mono is shown."
- (b) "Dates set in mono use the body face when vi-VN is showing (`:root[data-lang="vi-VN"] .date { font-family: body }`); mono stays ASCII-only."
Option (b) costs no bytes. Whichever is chosen, replace the sentence "Mono text stays ASCII in both languages."

**R2-M3. The Vietnamese content draft breaks the schema's per-version limits, so the build will fail.**
`.build-my-app/reports/translation-vi-draft.md` (counted in characters, NFC):
- `:20` data-file-viewer summary is 121 characters (max 120). Proposed (109): "Xem nhanh tệp CSV, Parquet, JSON, Excel, XML và Avro dạng bảng hoặc cây — dữ liệu không rời khỏi trình duyệt."
- `:22` text-case-converter summary is 128 (max 120). Proposed (120): "Xem một đoạn văn bản ở mọi kiểu chữ cùng lúc — camelCase, snake_case, kebab-case và hơn nữa — sao chép bằng một cú nhấp."
- `:33` headline is 97 (max 80). Proposed (80): "Kỹ sư Fullstack AI-Native. Mình cặp với AI, biến cà phê thành sản phẩm gọn gàng."
- `:38-46` bio is about 1534 (max 1500). Cut at least 60 characters for headroom. For example, drop "Tất nhiên là tất cả chạy trong Docker." and shorten "Đúng vậy, nói chuyện lịch sự với máy móc giờ cũng là một phần công việc của mình." to "Đúng vậy, nói chuyện lịch sự với máy giờ cũng là việc của mình."

## Minor

- **R2-m1** `ADR-0012…:32`: "the architecture's 20 KB HTML line item is re-measured and raised if needed" is stale. Architecture now says 26 KB: "…raised to 26 KB (architecture)".
- **R2-m2** `architecture.md:86-94`: the rows now add up to 183 KB against a "Total ≤ 170 KB". Either lower a row (fonts ≤ 80 KB is generous) or restate the total, for example "≤ 185 KB (15 KB headroom under NFR-11's 200 KB)".
- **R2-m3** The error format differs in three places: ADR-0005 note `file › entry › field › INV-09`, ADR-0012:18 `file › field › INV-09`, F-019.AC18 "the file, the field and INV-09". Use the ADR-0005 form in all three.
- **R2-m4** `project.schema.json`: the localized `headline`, `bio`, `category.name` and `nowNote.body` have no `minLength: 1`, while INV-09 says "non-empty". The ADR-0005 note says MOD-Content catches empties, but put `minLength: 1` on both versions so the schema and the invariant say the same thing. (Profile headline and bio stay optional as fields.)
- **R2-m5** ADR-0005 note: state that content is NFC-normalized, since `maxLength` counts code points and decomposed Vietnamese runs up to about 2× longer. "Content files are saved in Unicode NFC; the validator normalizes to NFC before checking lengths."

## Vietnamese content draft: language notes (translation-vi-draft.md)
The draft is natural and in Taro's voice. The bio and Now note read well ("Mình nhận hết, nhất là vế cuối", "Cứ tự nhiên nhé"). The legal register in the terms ("nguyên trạng", "toà án có thẩm quyền", "luật điều chỉnh") is right. Fixes:
- `:29` converters intro: "Số liệu và đơn vị tính sẵn cho bạn" can be read as "units of measure". Use "Mình tính sẵn số liệu và đổi đơn vị giúp bạn, vì tính nhẩm lúc 5 giờ chiều đâu phải là một tính năng."
- `:30` productivity intro: "giữ cho ngày của mình đi đúng hướng" is a calque. Use "Mấy công cụ giúp mình giữ nhịp cả ngày, và vài món nhắc mình nghỉ ngơi. Cả hai đều quan trọng."
- `:81, :88, :91`: the policy uses "portal" (an English word where "TaroKit" works) and "ngoại tuyến" (replaced by "mất mạng" in copy). Use "Để TaroKit hợp với bạn hơn…", "Để TaroKit dùng được cả khi không có mạng…", "…chạy tách biệt với TaroKit… bất cứ thứ gì TaroKit lưu."
- `:91`: same singular problem fixed in COPY-settings.privacyTools: "Điều duy nhất … là … và …" → "TaroKit chỉ cho nó biết hai điều: bạn đang dùng giao diện sáng hay tối, và đang đọc bằng tiếng Anh hay tiếng Việt, để nó hiển thị cho khớp."
- `:94` heading "Lưu trữ" (storage) is easy to confuse with the on-device storage section. Use "Hosting" or "Nơi đặt TaroKit".
- `:44` vs `:76`: the bio translates the awards ("Nhân viên của năm", "Nỗ lực xuất sắc"), but the résumé keeps the award names in English. Either keep them in English in the bio, in quotes, or localize the award titles (they are names, so the schema allows a map).
- `:64, :66` "Gợi ý bằng Neo4j" → "Hệ gợi ý bằng Neo4j" ("recommendations" means a recommender system here).
- `:105` "phần thông báo" for "notices" is ambiguous. Use "phần ghi chú giấy phép (notices)".
- Optional: `:40, :61` "đường ống dữ liệu" is correct but stiff; "pipeline dữ liệu" is what Vietnamese developers say. Keep whichever the Owner prefers, but use it consistently.
