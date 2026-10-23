---
id: SCR-Policy
title: Privacy and Terms
status: ready
features: [F-018, F-019]
components: [CMP-AppShell]
---

## Purpose
Read the privacy policy or the terms of use. One screen, used for both documents.

## Layout regions
1. Shell header.
2. Title (the policy's own title) and last updated date (COPY-policy.updated), the date shown in full as the month, day and year in the language showing ("October 22, 2026", "22 tháng 10, 2026"; RULE-16), the same full format the Now note's date is read with. With Vietnamese showing, the translation note (COPY-policy.translationNote; F-019.R6) follows the date.
3. Body: each section's heading, then its paragraphs and bulleted lists, at a comfortable reading width.
4. Shell footer.

## States
| State | When | What the user sees |
|---|---|---|
| default | policy present | everything above |
| empty | n/a | both policies are required by the build (F-018.R5) |
| loading | n/a | local content |
| error | n/a | — |

## Entry & exit
- Entered from: the shell footer on any portal page except the tool view; the site index; shared links.
- Exits to: any shell destination; links inside the policy text (web links open in a new tab, like profile links; email links open the mail app).

## Accessibility
One page heading (the policy title); section headings one level below it. The date is machine-readable and read in full. Links say where they go in their visible text.
