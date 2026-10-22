# TaroKit privacy policy and terms of use — DRAFT for owner review (F-018)

Written in Taro's voice (PRN-04). Not legal advice. Revised 2026-10-22 after spec review round 1 and the Cloudflare audit.

Facts checked against: NFR-05 / INV-05 (no data leaves the device except the theme sent to an embedded tool), RULE-13
(the latest 60 days used), F-006.R6 (days used shown in Settings), ADR-0010 (personal data in one on-device document),
F-013 (export, import, erase), F-011 (offline copy), RULE-07 (tools by others are linked, not embedded), D-037 (Web
Analytics/RUM disabled, Bot Fight Mode and Rocket Loader off), the live audit below, and the PolyForm Noncommercial 1.0.0
licence (D-051).

## Cloudflare audit (2026-10-22, read-only)
- One zone, `tarokit.app` (Free plan); four Workers: `tarokit`, `data-analysts-file-viewer`, `json-formatter`,
  `text-case-converter`. All are static assets.
- Live HTML of the portal pages and all three tools: no Cloudflare Web Analytics beacon, no Zaraz, no email
  obfuscation rewrite (the About page's mailto link is untouched), no challenge script, no Rocket Loader, no cookies set.
- Workers: Logpush off and no tail consumers on all four. Workers Logs (observability): `enabled: false` on the portal;
  not configured on the three tools (the API reports none).
- Logpush for the zone needs an Enterprise plan, so it can't be on.
- Not readable with the wrangler login's scopes: zone settings, the Web Analytics site list, Zaraz config and Bot Fight
  Mode. D-037 records them as checked in the dashboard (RUM disabled completely; Bot Fight Mode and Rocket Loader off).
- Always on and not switchable on any plan: Cloudflare's overall traffic analytics in the dashboard (request counts,
  bandwidth, countries; no individual visitors), and the security events log, which lists the IP address of requests
  Cloudflare blocks or challenges. The hosting section below says so.

## How the text maps to content
Each `###` heading below is one section (`heading`); the paragraphs and lists under it are its `body`. The title and the
last updated date come from the `title` and `updated` fields, so they are not written in the body.

---

## Privacy (`content/privacy.yaml`, title "Privacy", updated 2026-10-22)

### The short version
TaroKit doesn't collect your data. There are no accounts and no cookies, and I run no analytics, ads or trackers. What you do here stays on your device.

### What stays on your device
To make the portal yours, I keep a few things in your browser's storage on this device only:

- the tools you pin as favorites and the ones you opened recently;
- your theme choice (light, dark or system);
- the last 60 days on which you opened TaroKit, so Settings can show how often you use it.

None of this is sent to me or anyone else. You can save it to a backup file, load it on another device, or erase it at any time from Settings. Clearing your browser's site data erases it too.

So TaroKit works offline, your browser also keeps a copy of the portal's pages and files. That copy holds no personal data.

### The tools
Each tool is its own small website. The tools I build are made to run in your browser: files and text you give them are processed on your device and not uploaded. Each tool tells you how it handles your data inside the tool itself.

When a tool opens inside TaroKit, it runs walled off from the portal. It can't read your favorites or anything else the portal stores. The only thing the portal passes to it is whether you're using the light or dark theme, so it can match.

If I list a tool built by someone else, it opens on its own site in a new tab, and that site's own privacy policy applies.

### Hosting
TaroKit and the tools I build are served by Cloudflare. Like any web host, Cloudflare sees your IP address and basic browser details when your browser asks for a page, in order to deliver it and to protect the sites from attacks.

I haven't turned on Cloudflare's visitor analytics or logs. Its dashboard still shows me overall traffic numbers, such as how many requests the sites get and from which countries, but nothing that tells me who you are. If Cloudflare blocks a request as an attack, its security log shows me that request's IP address. Cloudflare's own handling is described in [its privacy policy](https://www.cloudflare.com/privacypolicy/).

### Changes
If this policy changes, I'll update this page and the date at the top.

### Contact
Questions? Email me, Thanh Nguyen Tri (Taro), at [adamnguyen.itdn@gmail.com](mailto:adamnguyen.itdn@gmail.com).

---

## Terms (`content/terms.yaml`, title "Terms", updated 2026-10-22)

### Using TaroKit
TaroKit and its tools are free to use. There are no accounts and nothing to sign up for.

### As is
I build these tools with care, but they're provided "as is", without any warranty, express or implied, including that they're fit for a particular purpose or free of errors. To the fullest extent the law allows, I'm not liable for any loss or damage from using them, including lost data or decisions made from what a tool shows you. Keep your own copies of anything important. The tools I build don't change the files you open in them; anything they save is a new file.

### Your files and content
What you open or type in a tool stays yours. The tools I build process it on your device and don't send it to me.

### Fair use
Please don't use TaroKit to break the law or to try to disrupt or attack the sites.

### Code and licenses
TaroKit's own code and content are licensed under PolyForm Noncommercial 1.0.0. Each tool has its own license, stated in its project. Open-source parts keep their own licenses; each tool lists them in its notices.

### Governing law
These terms are governed by the laws of Vietnam. Any dispute will be handled by the competent courts of Vietnam, unless the law where you live gives you a right to bring it elsewhere.

### Changes
I may update these terms. The date at the top shows when they last changed, and using TaroKit after that means you accept the new version.

### Contact
Questions? Email me at [adamnguyen.itdn@gmail.com](mailto:adamnguyen.itdn@gmail.com).
