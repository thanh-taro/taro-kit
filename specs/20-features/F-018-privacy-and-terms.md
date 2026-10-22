---
id: F-018
title: Read the privacy policy and terms
status: building
milestone: M-1
priority: P1
personas: [PER-01, PER-02]
entities: [ENT-Policy]
rules: []
screens: [SCR-Policy]
components: [CMP-AppShell]
nfr: [NFR-03, NFR-05, NFR-06, NFR-07, NFR-09, NFR-12]
events: []
depends_on: [F-001, F-015]
---

## Intent
Anyone using the portal or its tools can read, in plain words, what TaroKit does with their data and the ground rules for using it, with an honest last-updated date (PRN-03, PRN-04).

## Scope
- In: one portal-wide privacy policy and one portal-wide terms of use, each on its own page; links to both from every portal page except the tool view; link previews and the site index.
- Out: per-tool policies (each tool states its own data handling inside the tool); cookie banners or consent prompts (nothing needs consent, NFR-05); the palette's Pages group (F-004 is unchanged).

## Requirements
- **R1** The Privacy page shows the privacy policy (ENT-Policy): its title, its sections with their headings, paragraphs, lists and links as written, and its last updated date (COPY-policy.updated).
- **R2** The Terms page shows the terms of use (ENT-Policy) the same way.
- **R3** Every portal page except the tool view links to the Privacy and Terms pages (COPY-footer.privacy, COPY-footer.terms), and marks the link to the page being shown as the current page.
- **R4** Each page declares a title and description (COPY-meta.privacyTitle, COPY-meta.privacyDescription, COPY-meta.termsTitle, COPY-meta.termsDescription) with the shared preview image, and the site index lists both (F-015).
- **R5** Both policies are required content. The portal is not built when either is missing or invalid, and the failure names the file, the section when there is one, and the rule it breaks (F-001).

## Acceptance criteria
- **AC1** Given a privacy policy titled "Privacy" with two sections and the last updated date 2026-10-22, when the Privacy page opens, then the title is the only level-1 heading, both section headings are level-2 headings with their paragraphs below them, and "Last updated October 22, 2026" is shown with the date marked up as 2026-10-22. (R1)
- **AC2** Given terms of use titled "Terms" with three sections and the last updated date 2026-10-22, when the Terms page opens, then the title, the three headings, their paragraphs and "Last updated October 22, 2026" are shown. (R2)
- **AC3** Given the Home, Tools, a category, About, Résumé, Now, Settings, Privacy and Terms pages and a hidden tool's address (which shows the not-found page), when each opens, then it links to Privacy and Terms; on the Privacy page the Privacy link is marked as the current page, and on the Terms page the Terms link. Given the tool view of an embedded tool and of a linked tool, when each opens, then it shows neither link. (R3)
- **AC4** Given the built portal, when the Privacy and Terms pages' link previews and the site index are read, then each page has its title, description and the shared preview image, and the site index lists `/privacy/` and `/terms/`. (R4)
- **AC5** Given content without `content/terms.yaml`, when the portal is built, then the build fails and the error names `content/terms.yaml` as missing. (R5)
- **AC6** Given a privacy policy whose `updated` is `2026-13-01`, when the content is validated, then the build fails and the error names `content/privacy.yaml`, the `updated` field and the value. (R5)
- **AC7** Given one online visit, when the device is offline and the Privacy page opens, then the policy is shown. (R1)
- **AC8** Given a privacy policy paragraph with a link to https://www.cloudflare.com/privacypolicy/ and one to mailto:adamnguyen.itdn@gmail.com, and a section whose body holds a bulleted list of three items, when the Privacy page opens, then both links show their text and go to their address, the web link opens in a new tab, and the list shows as a list of three items. (R1)
- **AC9** Given a terms of use paragraph with a link to http://example.com, when the content is validated, then the build fails and the error names `content/terms.yaml`, the section and INV-02. (R5)
- **AC10** Given a terms of use with no sections, when the content is validated, then the build fails and the error names `content/terms.yaml` and the missing sections. (R5)

## UX notes
SCR-Policy for both pages; the links sit in CMP-AppShell's footer. The date is shown and read in full (SCR-Policy).

## Edge cases
- A policy older than 90 days is not labeled out of date: the out-of-date label belongs to the Now note only; a policy shows its date alone.
- A very long policy scrolls as a normal page; headings are real headings so screen-reader users can jump between sections.
- Text in a body that looks like a link but has an address other than https or email fails the build (INV-02); other bracketed text stays literal text.
- A paragraph that mixes list lines with other lines, or a body whose line breaks were folded away, fails the build naming the file and the section, so a list never shows as one run of text.
