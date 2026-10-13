---
id: F-015
title: Share rich link previews
status: ready
milestone: M-1
priority: P2
personas: [PER-02]
entities: [ENT-Profile, ENT-Tool, ENT-Project]
rules: [RULE-06]
screens: []
components: []
nfr: [NFR-12]
events: []
depends_on: [F-001]
---

## Intent
When a portal link is shared in chat or social media, the preview looks intentional and personal. That is often a visitor's first impression (PRN-04).

## Scope
- In: title, description and preview image for every public page and tool address; a site index for search engines.
- Out: a unique preview image per tool (M-2). M-1 uses one shared portal image.

## Requirements
- **R1** Every public portal page declares a title, a one-sentence description and the shared preview image (COPY-meta.homeTitle, COPY-meta.homeDescription, COPY-meta.aboutTitle, COPY-meta.aboutDescription, COPY-meta.toolsTitle, COPY-meta.toolsDescription, COPY-meta.projectsTitle, COPY-meta.projectsDescription, COPY-meta.nowTitle, COPY-meta.nowDescription).
- **R2** A tool's portal address declares the tool's name in its title (COPY-meta.toolTitle), its summary as the description, and the shared preview image.
- **R3** The portal publishes a site index listing its public pages and the portal addresses of visible tools, leaving out hidden entries (RULE-06).
- **R4** A hidden or unknown tool's portal address declares the not-found title (COPY-notFound.title) and nothing about the tool.

## Acceptance criteria
- **AC1** Given the About page, when its preview data is read, then the title, description and image match COPY-meta.aboutTitle, COPY-meta.aboutDescription and the shared image. (R1)
- **AC2** Given the tool "json", when its portal address's preview data is read, then the title contains the tool's name and the description is its summary. (R2)
- **AC3** Given one hidden tool, when the site index is read, then it does not contain that tool, and every listed tool entry is a portal address. (R3)
- **AC4** Given a hidden tool, when its portal address's preview data is read, then it shows the not-found title and not the tool's name. (R4)

## UX notes
Meets NFR-12.

## Edge cases
- Preview services cache old previews. Accepted.
