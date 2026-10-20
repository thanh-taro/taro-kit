---
id: F-008
title: About the Owner
status: shipped
milestone: M-1
priority: P0
personas: [PER-02]
entities: [ENT-Profile]
rules: []
screens: [SCR-About]
components: []
nfr: []
events: []
depends_on: [F-001]
---

## Intent
A visitor understands in one screen who Taro is, what they do, and how to reach them (PRN-04).

## Scope
- In: avatar, name, headline, bio, location, contact and social links.
- Out: a contact form (none; email link only); a blog (non-goal).

## Requirements
- **R1** The About page shows the profile: avatar (or initials of the full name when there is none), full name, nickname if set, headline, bio and, if set, location.
- **R2** The About page lists each profile link with its label. Web links open in a new tab; email links start a new message in the device's mail app.
- **R3** The About page links to the Now page (COPY-about.more).

## Acceptance criteria
- **AC1** Given a profile with an avatar, the name "Nguyen Tri Thanh", the nickname "Taro" and a location, when the About page opens, then the avatar, full name, nickname, headline, bio and location are shown. (R1)
- **AC2** Given a profile without an avatar for "Taro Example", when the About page opens, then the initials "TE" are shown in its place. (R1)
- **AC3** Given a profile with a code-host link labeled "Code", when the visitor activates it, then it opens in a new tab. (R2)
- **AC4** Given an email link, when the visitor activates it, then a new message to that address is started. (R2)
- **AC5** Given the About page, when it opens, then a link to Now is shown. (R3)

## UX notes
SCR-About.

## Edge cases
- A bio with paragraphs keeps its paragraph breaks.
