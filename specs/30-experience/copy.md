---
title: Copy
status: draft
---

# Copy (English)

Voice (PRN-04): TaroKit **is Taro talking to you**. Sentences are first person ("I", "my") and address the reader as "you". Labels, buttons and headings stay short and plain. Warm, brief, a little playful. Problems are owned ("I couldn't…") and say what to do next. No exclamation marks in errors. `{x}` marks a placeholder.

| ID | Text | Notes |
|---|---|---|
| **COPY-nav.home** | Home | navigation |
| **COPY-nav.tools** | Tools | navigation |
| **COPY-nav.projects** | Projects | navigation |
| **COPY-nav.about** | About me | navigation |
| **COPY-nav.now** | Now | navigation |
| **COPY-nav.settings** | Settings | navigation |
| **COPY-nav.menu** | Menu | narrow-layout menu button |
| **COPY-shell.skip** | Skip to content | first focusable element |
| **COPY-shell.offline** | You're offline. Tools that need the internet are paused. | quiet indicator |
| **COPY-shell.updateReady** | I've shipped an update to TaroKit. | update message |
| **COPY-shell.refresh** | Refresh | update action |
| **COPY-shell.themeToggle** | Switch to {theme} theme | header quick-toggle label; {theme} is light or dark |
| **COPY-home.greetingMorning** | Good morning | 05:00–11:59 |
| **COPY-home.greetingAfternoon** | Good afternoon | 12:00–17:59 |
| **COPY-home.greetingEvening** | Good evening | 18:00–04:59 |
| **COPY-home.favorites** | Your favorites | section heading |
| **COPY-home.recents** | Recently used | section heading |
| **COPY-home.intro** | I'm {nickname}. {headline} | home introduction (F-007.R5); falls back to the full name |
| **COPY-home.whatsNew** | Fresh from my workbench | section heading |
| **COPY-home.firstVisit** | New here? These are the tools I've built for work and life. Browse them, or press {shortcut} and I'll find anything for you. | first-visit invitation, keyboard devices |
| **COPY-home.firstVisitTouch** | New here? These are the tools I've built for work and life. Browse them, or tap search and I'll find anything for you. | first-visit invitation, touch-only devices |
| **COPY-catalog.title** | My tools | page heading |
| **COPY-catalog.searchPlaceholder** | Filter my tools | search field |
| **COPY-catalog.all** | All | category filter |
| **COPY-catalog.empty** | I'm still building my first tools. Check back soon. | empty state |
| **COPY-catalog.noResults** | I don't have anything matching "{query}" yet. | no-results state |
| **COPY-catalog.clear** | Clear search | action |
| **COPY-tool.opensNewTab** | Opens in a new tab | linked marker |
| **COPY-tool.unavailable** | Needs the internet | card state |
| **COPY-tool.back** | Back | tool header |
| **COPY-tool.openNewTab** | Open in new tab | tool header action |
| **COPY-tool.loading** | Getting {tool} ready… | tool view |
| **COPY-tool.slow** | {tool} is taking its time. You can open it in a new tab instead. | after the slow-load threshold |
| **COPY-tool.offline** | {tool} needs the internet. I'll load it as soon as you're back online. | offline state |
| **COPY-tool.linkedNote** | {tool} lives on its own site. Open it there. | linked tool view |
| **COPY-fav.add** | Add to favorites | toggle label (off) |
| **COPY-fav.remove** | Remove from favorites | toggle label (on) |
| **COPY-fav.full** | You can keep up to {limit} favorites. Unpin one to make room. | limit reached; {limit} from RULE-02 |
| **COPY-storage.unavailable** | Your browser isn't letting me save anything right now, so I'll forget your favorites and recents when you leave. | one-time notice |
| **COPY-palette.placeholder** | What are you looking for? ({shortcut}) | search field |
| **COPY-palette.groupFavorites** | Favorites | group heading |
| **COPY-palette.groupRecents** | Recent | group heading |
| **COPY-palette.groupTools** | Tools | group heading |
| **COPY-palette.groupProjects** | Projects | group heading |
| **COPY-palette.groupPages** | Pages | group heading |
| **COPY-palette.groupActions** | Actions | group heading |
| **COPY-palette.hints** | ↑↓ to move · Enter to open · Esc to close | footer |
| **COPY-palette.noResults** | I couldn't find "{query}". | no-results state |
| **COPY-palette.browseAll** | Browse all my tools | no-results action |
| **COPY-palette.actionTheme** | Toggle light/dark theme | action name |
| **COPY-palette.actionExport** | Export your data | action name |
| **COPY-palette.actionCopy** | Copy link to this page | action name |
| **COPY-palette.dialogLabel** | Search TaroKit | accessible name of the palette dialog |
| **COPY-palette.close** | Cancel | closes the touch sheet |
| **COPY-palette.copied** | Link copied | confirmation |
| **COPY-about.links** | Find me | section heading |
| **COPY-about.more** | See what I've built and what I'm up to now. | pointer to Projects and Now |
| **COPY-projects.title** | Things I've built | page heading |
| **COPY-projects.empty** | I'm putting my projects together. Check back soon. | empty state |
| **COPY-now.updated** | Updated {date} | Now note date |
| **COPY-now.stale** | I wrote this a while ago, so it may be out of date. | when older than 90 days |
| **COPY-now.changelogTitle** | What I've shipped | section heading |
| **COPY-now.changelogAdded** | Added {tool} | changelog item |
| **COPY-now.changelogUpdated** | Improved {tool} | changelog item |
| **COPY-now.empty** | Nothing to share yet. Check back soon. | no note and no tools |
| **COPY-settings.theme** | Theme: System, Light, Dark | setting label and options |
| **COPY-settings.export** | Export your data | button |
| **COPY-settings.import** | Import from file | button |
| **COPY-settings.clearRecents** | Clear recent tools | button |
| **COPY-settings.erase** | Erase your data | button |
| **COPY-settings.daysUsed** | You've used TaroKit on {count} of the last 14 days | days-used line (RULE-13) |
| **COPY-common.confirm** | Confirm | confirmation dialog |
| **COPY-common.cancel** | Cancel | confirmation dialog |
| **COPY-import.notBackup** | it isn't a TaroKit backup | import reason |
| **COPY-import.damaged** | it's damaged or incomplete | import reason |
| **COPY-import.newerVersion** | it came from a newer version of TaroKit | import reason |
| **COPY-import.tooLarge** | it has more favorites or recents than I can keep | import reason |
| **COPY-settings.backupScope** | Your backup holds your favorites, recents, theme and days used. Each tool keeps its own data. | export note |
| **COPY-settings.importInvalid** | I couldn't import that file because {reason}. Nothing changed. | import error |
| **COPY-settings.importConfirm** | Replace your favorites, recents, theme and days used with the ones in this file? | confirm import |
| **COPY-settings.clearRecentsConfirm** | Clear your recent tools? | confirm |
| **COPY-settings.eraseConfirm** | Erase all your TaroKit data on this device? This can't be undone. | confirm |
| **COPY-settings.privacy** | No accounts, no tracking. Everything you do here stays in your browser, and I never see it. | privacy statement |
| **COPY-notFound.title** | I can't find that page | not-found heading |
| **COPY-notFound.body** | It may have moved, or I took it down. | not-found body |
| **COPY-notFound.toCatalog** | Browse my tools | not-found action |
| **COPY-meta.homeTitle** | TaroKit — Taro's tools and work | home preview title |
| **COPY-meta.homeDescription** | Hi, I'm Taro. These are the tools I build for work and life, and a bit about me. | home preview description |
| **COPY-meta.toolsTitle** | Tools — TaroKit | catalog preview title |
| **COPY-meta.toolsDescription** | Every tool I've built, by category. | catalog preview description |
| **COPY-meta.toolTitle** | {tool} — TaroKit | tool preview title |
| **COPY-meta.aboutTitle** | About me — TaroKit | About preview title |
| **COPY-meta.aboutDescription** | Who I am, what I do, and how to reach me. | About preview description |
| **COPY-meta.projectsTitle** | Projects — TaroKit | projects preview title |
| **COPY-meta.projectsDescription** | Things I've built beyond the toolkit. | projects preview description |
| **COPY-meta.nowTitle** | Now — TaroKit | Now preview title |
| **COPY-meta.nowDescription** | What I'm focused on, and what's new in TaroKit. | Now preview description |
