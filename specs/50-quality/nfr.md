---
title: Non-functional requirements
status: draft
---

# Non-functional requirements

| ID | Requirement | Measure |
|---|---|---|
| **NFR-01** | Fast first view. | On the reference device and network profile defined in 40-technical, the greeting and search entry of home are rendered and respond to input within 1.5 s on a first visit, and within 0.5 s on repeat or installed visits (lab measurement, median of 5 runs). |
| **NFR-02** | Instant search. | On the reference device, the palette opens within 100 ms of the shortcut, and results update within 50 ms per keystroke with 500 catalog entries. |
| **NFR-03** | Accessible. | WCAG 2.2 AA in both themes; automated audit with zero serious issues; manual screen-reader pass on the M-1 flows (FLOW-01, FLOW-02, FLOW-03). |
| **NFR-04** | Keyboard-complete. | Every feature works with the keyboard alone; focus is always visible; no keyboard traps outside the embedded tool area. |
| **NFR-05** | Private. | The portal makes zero requests to third parties of its own (all fonts, icons and images are bundled); no cookies; no analytics or fingerprinting; personal data never leaves the device (INV-05). |
| **NFR-06** | Works offline. | After one online visit, every portal page and all catalog content load with no network. |
| **NFR-07** | Responsive. | Layouts work from 320 px to 2560 px wide with no horizontal scrolling; text zooms to 200 % without loss. |
| **NFR-08** | Isolated tools. | Embedded tools run isolated from the portal with only their declared permissions (RULE-10); the portal restricts which sites may be embedded to catalog addresses. |
| **NFR-09** | Touch-friendly. | Interactive targets are at least 44 × 44 CSS px on touch devices. |
| **NFR-10** | Supported browsers. | The two latest major versions of each browser engine listed in 40-technical, on desktop and mobile. |
| **NFR-11** | Lightweight. | The home page's initial transfer is no more than 200 KB compressed, excluding the avatar image. |
| **NFR-12** | Shareable. | Every public page declares a title (≤ 60 characters), a description (≤ 160 characters) and a preview image (at least 1200 × 630 px) using the open link-preview metadata standard. |
