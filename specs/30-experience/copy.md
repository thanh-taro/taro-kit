---
title: Copy
status: draft
---

# Copy

Voice (PRN-04): TaroKit **is Taro talking to you**. Sentences are first person ("I", "my") and address the reader as "you". Labels, buttons and headings stay short and plain. Warm, brief, a little playful. Problems are owned ("I couldn't…") and say what to do next. No exclamation marks in errors. `{x}` marks a placeholder.

Every string has an English (en-US) and a Vietnamese (vi-VN) version (F-019, RULE-16); both are required. The Vietnamese voice is the same Taro: "mình" for Taro and "bạn" for the reader, casual and warm, with straight quotes as in English and no English words where a common Vietnamese one exists ("internet", "menu", "CV" and product names stay as they are).

| ID | en-US | vi-VN | Notes |
|---|---|---|---|
| **COPY-nav.home** | Home | Trang chủ | navigation |
| **COPY-nav.tools** | Tools | Công cụ | navigation |
| **COPY-nav.projects** | Projects | Dự án | deprecated (D-055): not shown |
| **COPY-nav.about** | About me | Về mình | navigation |
| **COPY-nav.now** | Now | Dạo này | navigation |
| **COPY-nav.resume** | Résumé | CV | navigation, when there is a résumé (F-017) |
| **COPY-nav.settings** | Settings | Cài đặt | navigation |
| **COPY-nav.menu** | Menu | Menu | narrow-layout menu button |
| **COPY-shell.brand** | TaroKit | TaroKit | wordmark in the shell header |
| **COPY-shell.skip** | Skip to content | Chuyển đến nội dung | first focusable element |
| **COPY-shell.offline** | You're offline. Tools that need the internet are paused. | Bạn đang mất mạng. Các công cụ cần internet tạm dừng nhé. | quiet indicator |
| **COPY-shell.updateReady** | I've shipped an update to TaroKit. | Mình vừa cập nhật TaroKit. | update message |
| **COPY-shell.refresh** | Refresh | Làm mới | update action |
| **COPY-shell.themeToggle** | Switch to {theme} theme | Chuyển sang giao diện {theme} | header quick-toggle label; {theme} is COPY-settings.themeLight or COPY-settings.themeDark in lower case |
| **COPY-shell.languageSwitch** | Switch to {language} | Chuyển sang {language} | header language switch label (F-019.R2); {language} is the other language's name, COPY-language.en or COPY-language.vi, marked with its language |
| **COPY-shell.search** | Search | Tìm kiếm | search control label on the compact and narrow shell; opens the palette |
| **COPY-home.greetingMorning** | Good morning | Chào buổi sáng | 05:00–11:59 |
| **COPY-home.greetingAfternoon** | Good afternoon | Chào buổi chiều | 12:00–17:59 |
| **COPY-home.greetingEvening** | Good evening | Chào buổi tối | 18:00–04:59 |
| **COPY-home.favorites** | Your favorites | Mục yêu thích của bạn | section heading |
| **COPY-home.recents** | Recently used | Dùng gần đây | section heading |
| **COPY-home.intro** | I'm {nickname}. {headline} | Mình là {nickname}. {headline} | home introduction (F-007.R5); falls back to the full name |
| **COPY-home.categories** | Browse by category | Xem theo danh mục | section heading |
| **COPY-home.whatsNew** | Fresh from my workbench | Mới ra lò từ xưởng của mình | section heading |
| **COPY-home.firstVisit** | New here? These are the tools I've built for work and life. Browse them, or press {shortcut} and I'll find anything for you. | Lần đầu ghé? Đây là những công cụ mình làm cho công việc và cuộc sống. Cứ xem qua, hoặc nhấn {shortcut} để mình tìm giúp bạn. | first-visit invitation, keyboard devices |
| **COPY-home.firstVisitTouch** | New here? These are the tools I've built for work and life. Browse them, or tap search and I'll find anything for you. | Lần đầu ghé? Đây là những công cụ mình làm cho công việc và cuộc sống. Cứ xem qua, hoặc chạm vào tìm kiếm để mình tìm giúp bạn. | first-visit invitation, touch-only devices |
| **COPY-catalog.title** | My tools | Công cụ của mình | page heading |
| **COPY-catalog.searchPlaceholder** | Filter my tools | Lọc công cụ | search field |
| **COPY-catalog.empty** | I'm still building my first tools. Check back soon. | Mình đang làm những công cụ đầu tiên. Bạn quay lại sau nhé. | empty state |
| **COPY-catalog.noResults** | I don't have anything matching "{query}" yet. | Mình chưa có gì khớp với "{query}". | no-results state |
| **COPY-catalog.clear** | Clear search | Xoá tìm kiếm | action |
| **COPY-catalog.searchUnavailable** | I couldn't load my search just now. Every tool is still listed below; reload the page to try again. | Mình chưa tải được phần tìm kiếm. Mọi công cụ vẫn có ở bên dưới; tải lại trang để thử lại. | search field description when the catalog data can't load |
| **COPY-tool.opensNewTab** | Opens in a new tab | Mở trong thẻ mới | linked marker |
| **COPY-tool.unavailable** | Needs the internet | Cần internet | card state |
| **COPY-tool.back** | Back | Quay lại | tool header |
| **COPY-tool.openNewTab** | Open in new tab | Mở trong thẻ mới | tool header action |
| **COPY-tool.loading** | Getting {tool} ready… | Đang chuẩn bị {tool}… | tool view |
| **COPY-tool.slow** | {tool} is taking its time. You can open it in a new tab instead. | {tool} hơi chậm. Bạn có thể mở nó trong thẻ mới. | after the slow-load threshold |
| **COPY-tool.offline** | {tool} needs the internet. I'll load it as soon as you're back online. | {tool} cần internet. Mình sẽ tải ngay khi bạn có mạng trở lại. | offline state |
| **COPY-tool.linkedNote** | {tool} lives on its own site. Open it there. | {tool} nằm ở trang riêng. Bạn mở ở đó nhé. | linked tool view |
| **COPY-tool.frameLabel** | {tool} tool | Công cụ {tool} | accessible name of the embedded tool region and its frame (SCR-ToolView, ADR-0009) |
| **COPY-tool.toolbarLabel** | {tool} controls | Điều khiển {tool} | accessible name of the tool header toolbar (SCR-ToolView) |
| **COPY-fav.add** | Add to favorites | Thêm vào yêu thích | toggle label (off) |
| **COPY-fav.remove** | Remove from favorites | Bỏ khỏi yêu thích | toggle label (on) |
| **COPY-fav.full** | You can keep up to {limit} favorites. Unpin one to make room. | Bạn giữ được tối đa {limit} mục yêu thích. Bỏ ghim một mục để có chỗ. | limit reached; {limit} from RULE-02 |
| **COPY-storage.unavailable** | Your browser isn't letting me save anything right now, so I'll forget your favorites, recents, theme and language when you leave. | Trình duyệt đang không cho mình lưu gì cả, nên mình sẽ quên mục yêu thích, công cụ gần đây, giao diện và ngôn ngữ khi bạn rời đi. | one-time notice |
| **COPY-palette.placeholder** | What are you looking for? ({shortcut}) | Bạn đang tìm gì? ({shortcut}) | search field |
| **COPY-palette.groupFavorites** | Favorites | Yêu thích | group heading |
| **COPY-palette.groupRecents** | Recent | Gần đây | group heading |
| **COPY-palette.groupTools** | Tools | Công cụ | group heading |
| **COPY-palette.groupProjects** | Projects | Dự án | deprecated (D-055): not shown |
| **COPY-palette.groupPages** | Pages | Trang | group heading |
| **COPY-palette.groupActions** | Actions | Thao tác | group heading |
| **COPY-palette.hints** | ↑↓ to move · Enter to open · Esc to close | ↑↓ để di chuyển · Enter để mở · Esc để đóng | footer |
| **COPY-palette.noResults** | I couldn't find "{query}". | Mình không tìm thấy "{query}". | no-results state |
| **COPY-palette.browseAll** | Browse all my tools | Xem tất cả công cụ của mình | no-results action |
| **COPY-palette.actionTheme** | Toggle light/dark theme | Đổi giao diện sáng/tối | action name |
| **COPY-palette.actionLanguage** | Switch to {language} | Chuyển sang {language} | action name (F-019.R2); {language} as in COPY-shell.languageSwitch |
| **COPY-palette.actionExport** | Export your data | Xuất dữ liệu của bạn | action name |
| **COPY-palette.actionCopy** | Copy link to this page | Sao chép liên kết trang này | action name |
| **COPY-palette.dialogLabel** | Search TaroKit | Tìm trong TaroKit | accessible name of the palette dialog |
| **COPY-palette.close** | Cancel | Huỷ | closes the touch sheet |
| **COPY-palette.copied** | Link copied | Đã sao chép liên kết | confirmation |
| **COPY-palette.resultCount** | {count} results | {count} kết quả | announced result count; singular form is COPY-palette.resultCountOne |
| **COPY-palette.resultCountOne** | 1 result | 1 kết quả | singular of COPY-palette.resultCount |
| **COPY-palette.exportFailed** | I couldn't save your backup just now. Please try again. | Mình chưa lưu được bản sao lưu. Bạn thử lại nhé. | when the palette's export action fails |
| **COPY-palette.unavailable** | I couldn't load my tools just now. Pages and actions still work; reload the page to try again. | Mình chưa tải được danh sách công cụ. Trang và thao tác vẫn dùng được; tải lại trang để thử lại. | when the catalog data can't load |
| **COPY-about.links** | Find me | Tìm mình ở | section heading |
| **COPY-about.more** | See what I'm up to now. | Xem dạo này mình đang làm gì. | pointer to Now |
| **COPY-about.resume** | Want the long version? Here's my résumé. | Muốn xem bản đầy đủ? Đây là CV của mình. | pointer to SCR-Resume, when there is a résumé (F-017.R4) |
| **COPY-about.nickname** | aka {nickname} | còn gọi là {nickname} | under the avatar, when the profile has a nickname |
| **COPY-about.avatarAlt** | Portrait of {name} | Ảnh chân dung {name} | avatar alt text; {name} is the full name (SCR-About accessibility) |
| **COPY-category.toolCount** | {count} tools | {count} công cụ | count on tiles and category pages; singular form is COPY-category.toolCountOne |
| **COPY-category.toolCountOne** | 1 tool | 1 công cụ | singular of COPY-category.toolCount |
| **COPY-category.allTools** | All my tools | Tất cả công cụ của mình | link from a category page back to the catalog |
| **COPY-category.navLabel** | Categories | Danh mục | accessible name of the category navigation |
| **COPY-resume.title** | My résumé | CV của mình | page heading |
| **COPY-resume.intro** | The long version: where I've worked, what I studied, and what I picked up along the way. | Bản đầy đủ: mình đã làm ở đâu, học những gì, và nhặt nhạnh được gì trên đường đi. | under the heading |
| **COPY-resume.experience** | Experience | Kinh nghiệm | section heading |
| **COPY-resume.education** | Education | Học vấn | section heading |
| **COPY-resume.skills** | Skills | Kỹ năng | section heading |
| **COPY-resume.languages** | Languages | Ngôn ngữ | section heading |
| **COPY-resume.certificates** | Certificates | Chứng chỉ | section heading |
| **COPY-resume.awards** | Awards | Giải thưởng | section heading |
| **COPY-resume.present** | present | nay | end of a current period (RULE-15) |
| **COPY-resume.period** | {start} – {end} | {start} – {end} | a period, e.g. "June 2022 – present", "tháng 6 năm 2022 – nay"; {start} and {end} are month and year, or COPY-resume.present (RULE-15) |
| **COPY-resume.skillLevel** | {level} out of 5 | {level} trên 5 | a skill level in words (RULE-15) |
| **COPY-resume.skillLevelShort** | {level}/5 | {level}/5 | a skill level below 5, shown on its chip (RULE-15) |
| **COPY-projects.title** | Things I've built | Những thứ mình đã làm | deprecated (D-055): not shown |
| **COPY-projects.empty** | I'm putting my projects together. Check back soon. | Mình đang tổng hợp các dự án. Bạn quay lại sau nhé. | deprecated (D-055): not shown |
| **COPY-projects.imageAlt** | Screenshot of {name} | Ảnh chụp màn hình {name} | deprecated (D-055): not shown |
| **COPY-now.title** | What I'm up to | Dạo này mình đang làm gì | Now section heading |
| **COPY-now.updated** | Updated {date} | Cập nhật {date} | Now note date |
| **COPY-now.stale** | I wrote this a while ago, so it may be out of date. | Mình viết cái này lâu rồi, nên có thể đã cũ. | when older than 90 days |
| **COPY-now.changelogTitle** | What I've shipped | Những gì mình đã ra mắt | section heading |
| **COPY-now.changelogAdded** | Added {tool} | Đã thêm {tool} | changelog item |
| **COPY-now.changelogUpdated** | Improved {tool} | Đã cải thiện {tool} | changelog item |
| **COPY-now.empty** | Nothing to share yet. Check back soon. | Chưa có gì để chia sẻ. Bạn quay lại sau nhé. | no note and no tools |
| **COPY-settings.title** | Settings | Cài đặt | page heading |
| **COPY-settings.appearance** | Appearance | Hiển thị | section heading |
| **COPY-settings.yourData** | Your data | Dữ liệu của bạn | section heading |
| **COPY-settings.privacyTitle** | Privacy | Quyền riêng tư | section heading |
| **COPY-settings.theme** | Theme | Giao diện | theme setting label |
| **COPY-settings.themeSystem** | System | Theo hệ thống | theme option |
| **COPY-settings.themeLight** | Light | Sáng | theme option |
| **COPY-settings.themeDark** | Dark | Tối | theme option |
| **COPY-settings.language** | Language | Ngôn ngữ | language setting label (F-019.R2) |
| **COPY-language.en** | English | English | name of en-US, always in English and marked en-US (F-019 UX notes) |
| **COPY-language.vi** | Tiếng Việt | Tiếng Việt | name of vi-VN, always in Vietnamese and marked vi-VN (F-019 UX notes) |
| **COPY-language.device** | Match my device | Theo thiết bị | language option that removes the stored choice (F-019.R2) |
| **COPY-settings.export** | Export your data | Xuất dữ liệu của bạn | button |
| **COPY-settings.import** | Import from file | Nhập từ tệp | button |
| **COPY-settings.clearRecents** | Clear recent tools | Xoá công cụ gần đây | button |
| **COPY-settings.erase** | Erase your data | Xoá dữ liệu của bạn | button |
| **COPY-settings.daysUsed** | You've used TaroKit on {count} of the last 14 days | Bạn đã dùng TaroKit {count} ngày trong 14 ngày qua | days-used line (RULE-13) |
| **COPY-common.confirm** | Confirm | Xác nhận | confirmation dialog |
| **COPY-common.cancel** | Cancel | Huỷ | confirmation dialog |
| **COPY-import.notBackup** | it isn't a TaroKit backup | đây không phải bản sao lưu TaroKit | import reason |
| **COPY-import.damaged** | it's damaged or incomplete | tệp bị hỏng hoặc không đầy đủ | import reason |
| **COPY-import.newerVersion** | it came from a newer version of TaroKit | tệp đến từ phiên bản TaroKit mới hơn | import reason |
| **COPY-import.tooLarge** | it has more favorites or recents than I can keep | tệp có nhiều mục yêu thích hoặc công cụ gần đây hơn mức mình giữ được | import reason |
| **COPY-settings.backupScope** | Your backup holds your favorites, recents, theme, language and days used. Each tool keeps its own data. | Bản sao lưu gồm mục yêu thích, công cụ gần đây, giao diện, ngôn ngữ và số ngày đã dùng. Mỗi công cụ tự giữ dữ liệu riêng. | export note |
| **COPY-settings.importInvalid** | I couldn't import that file because {reason}. Nothing changed. | Mình không nhập được tệp đó vì {reason}. Chưa có gì thay đổi. | import error |
| **COPY-settings.importConfirm** | Replace your favorites, recents, theme, language and days used with the ones in this file? | Thay mục yêu thích, công cụ gần đây, giao diện, ngôn ngữ và số ngày đã dùng bằng dữ liệu trong tệp này? | confirm import |
| **COPY-settings.clearRecentsConfirm** | Clear your recent tools? | Xoá các công cụ gần đây? | confirm |
| **COPY-settings.clearRecentsUnsaved** | I cleared your recent tools for now, but couldn't save that on this device, so they may come back next time. | Mình đã xoá công cụ gần đây cho lần này, nhưng không lưu được trên thiết bị, nên lần sau chúng có thể quay lại. | clear-recents error (F-006.R4) |
| **COPY-settings.eraseConfirm** | Erase all your TaroKit data on this device? This can't be undone. | Xoá toàn bộ dữ liệu TaroKit trên thiết bị này? Không thể hoàn tác. | confirm |
| **COPY-settings.eraseUnsaved** | I erased your data for now, but couldn't save that on this device, so it may come back next time. | Mình đã xoá dữ liệu cho lần này, nhưng không lưu được trên thiết bị, nên lần sau nó có thể quay lại. | erase error (F-013 edge case) |
| **COPY-settings.importUnsaved** | I imported that file for now, but couldn't save it on this device, so your old data may come back next time. | Mình đã nhập tệp đó cho lần này, nhưng không lưu được trên thiết bị, nên dữ liệu cũ có thể quay lại lần sau. | import error (F-013 edge case) |
| **COPY-settings.importFailed** | I couldn't open that file just now. Please try again. | Mình chưa mở được tệp đó. Bạn thử lại nhé. | when settings can't read the picked file or load the import (F-013 edge case) |
| **COPY-settings.exportFailed** | I couldn't save your backup just now. Please try again. | Mình chưa lưu được bản sao lưu. Bạn thử lại nhé. | when settings' export fails (F-013 edge case) |
| **COPY-settings.privacy** | No accounts, no tracking, no cookies. Your favorites, recent tools, days used, theme and language stay in this browser, and they only leave it if you export a backup. | Không tài khoản, không theo dõi, không cookie. Mục yêu thích, công cụ gần đây, số ngày đã dùng, giao diện và ngôn ngữ của bạn ở lại trong trình duyệt này, và chỉ rời khỏi đó khi bạn xuất bản sao lưu. | privacy statement, paragraph 1: what stays on the device (INV-05) |
| **COPY-settings.privacyTools** | Each tool is its own site and tells you how it handles your data. The only things I tell a tool inside TaroKit are your theme and language. | Mỗi công cụ là một trang riêng và tự cho bạn biết cách nó xử lý dữ liệu. Mình chỉ cho công cụ trong TaroKit biết hai điều: giao diện và ngôn ngữ bạn đang dùng. | privacy statement, paragraph 2: tools (INV-05 exception, F-012.R5) |
| **COPY-settings.privacyHosting** | Cloudflare hosts TaroKit and, like any host, handles request data such as your IP address to serve it. I don't use its analytics. | Cloudflare lưu trữ TaroKit và, như mọi nhà cung cấp hosting, xử lý dữ liệu yêu cầu như địa chỉ IP của bạn để phục vụ trang. Mình không dùng tính năng phân tích của họ. | privacy statement, paragraph 3: hosting (D-037) |
| **COPY-footer.privacy** | Privacy | Quyền riêng tư | shell footer link to the Privacy page (F-018) |
| **COPY-footer.terms** | Terms | Điều khoản | shell footer link to the Terms page (F-018) |
| **COPY-policy.updated** | Last updated {date} | Cập nhật lần cuối {date} | policy date, read in full (SCR-Policy) |
| **COPY-policy.translationNote** | This is a translation. If it differs from the English version, the English version applies. | Đây là bản dịch để bạn tiện đọc. Nếu có chỗ nào khác với bản tiếng Anh, bản tiếng Anh được áp dụng. | Privacy and Terms pages, shown only with Vietnamese showing (F-019.R6, D-063) |
| **COPY-notFound.title** | I can't find that page | Mình không tìm thấy trang đó | not-found heading |
| **COPY-notFound.body** | It may have moved, or I took it down. | Có thể nó đã chuyển đi, hoặc mình đã gỡ nó xuống. | not-found body |
| **COPY-notFound.toCatalog** | Browse my tools | Xem các công cụ của mình | not-found action; also the home first-visit invitation's action (SCR-Home empty) |
| **COPY-meta.homeTitle** | TaroKit — Taro's tools and work | TaroKit — Công cụ và dự án của Taro | home preview title |
| **COPY-meta.homeDescription** | Hi, I'm Taro. These are the tools I build for work and life, and a bit about me. | Chào, mình là Taro. Đây là những công cụ mình làm cho công việc và cuộc sống, và đôi chút về mình. | home preview description |
| **COPY-meta.toolsTitle** | Tools — TaroKit | Công cụ — TaroKit | catalog preview title |
| **COPY-meta.toolsDescription** | Every tool I've built, by category. | Mọi công cụ mình đã làm, theo danh mục. | catalog preview description |
| **COPY-meta.categoryTitle** | {category} — TaroKit | {category} — TaroKit | category preview title; the description is the category intro |
| **COPY-meta.settingsTitle** | Settings — TaroKit | Cài đặt — TaroKit | settings page title (not in the site index) |
| **COPY-meta.settingsDescription** | Your theme, language and data on this device. | Giao diện, ngôn ngữ và dữ liệu của bạn trên thiết bị này. | settings page description |
| **COPY-meta.toolTitle** | {tool} — TaroKit | {tool} — TaroKit | tool preview title |
| **COPY-meta.aboutTitle** | About me — TaroKit | Về mình — TaroKit | About preview title |
| **COPY-meta.aboutDescription** | Who I am, what I do, and how to reach me. | Mình là ai, làm gì, và cách liên lạc với mình. | About preview description |
| **COPY-meta.projectsTitle** | Projects — TaroKit | Dự án — TaroKit | deprecated (D-055): not shown |
| **COPY-meta.projectsDescription** | Things I've built beyond the toolkit. | Những thứ mình làm ngoài bộ công cụ. | deprecated (D-055): not shown |
| **COPY-meta.resumeTitle** | Résumé — TaroKit | CV — TaroKit | Résumé preview title |
| **COPY-meta.resumeDescription** | Where I've worked, what I studied, and what I'm good at. | Mình đã làm ở đâu, học gì, và giỏi những gì. | Résumé preview description |
| **COPY-meta.privacyTitle** | Privacy — TaroKit | Quyền riêng tư — TaroKit | Privacy preview title (F-018) |
| **COPY-meta.privacyDescription** | How I handle your data: what stays on your device, and what reaches my host. | Cách mình xử lý dữ liệu của bạn: điều gì ở lại trên thiết bị, và điều gì đến nhà cung cấp hosting. | Privacy preview description |
| **COPY-meta.termsTitle** | Terms — TaroKit | Điều khoản — TaroKit | Terms preview title (F-018) |
| **COPY-meta.termsDescription** | The ground rules for using TaroKit and the tools I build. | Các quy tắc cơ bản khi dùng TaroKit và các công cụ mình làm. | Terms preview description |
| **COPY-meta.nowTitle** | Now — TaroKit | Dạo này — TaroKit | Now preview title |
| **COPY-meta.nowDescription** | What I'm focused on, and what's new in TaroKit. | Mình đang tập trung vào gì, và TaroKit có gì mới. | Now preview description |
