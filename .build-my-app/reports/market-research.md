# TaroKit — Market research (phase 1.1)

Source: market-researcher agent, 2026-10-13. Evidence on user sentiment is thin: complaint themes are hypotheses. Browser-extension toolkits were not researched, and transform.tools was not verified.

## Competitors
| Tool | Positioning, tech, pricing |
|---|---|
| IT-Tools | Dev/IT hub. Vue 3, TS, Vite. **GPL-3.0**, ~40.8k stars, self-hostable, free. One folder per tool. https://github.com/CorentinTh/it-tools |
| DevToys | Desktop dev toolbox. MIT, C#/Blazor. ~30 tools, Smart Detection of clipboard content, extensions. https://github.com/DevToys-app/DevToys |
| CyberChef | Apache-2.0. Fully client-side; "recipe" chaining; state in the URL hash; offline download. https://github.com/gchq/CyberChef |
| Omni Calculator | Hundreds of calculators. Free, ~19M visits/mo. https://www.omnicalculator.com/about-us |
| TinyWow / iLovePDF / Smallpdf | Freemium, server-side file tools. Ads plus task/file caps; ~$5–6/mo premium. https://ilovepdf.com/pricing |
| 10015.io | Small-tool aggregator. Tool count unreliable (70+ vs 10,000+). https://10015.io/product/10015-tools |
| Raycast | Launcher with an extension store. Pro $8/mo. Some extensions unmaintained. |
| PowerToys Command Palette | Windows launcher. Manifest-registered, out-of-process extensions; typed page kinds. https://learn.microsoft.com/en-us/windows/powertoys/command-palette/extensibility-overview |

## Praise
Client-side and offline operation (CyberChef, DevToys); self-hosting (IT-Tools).

## Complaints
- Ads and task/file caps on freemium hubs.
- DevToys is Windows-centric.
- CyberChef is slow on large inputs.
- IT-Tools has 492 open issues (many tool requests; persistent favorites is one).
- Extension marketplaces carry unmaintained extensions.
- Unverified: slow search, inconsistent UI.

## Opportunities
1. Command palette (Cmd/Ctrl+K), keyboard-first.
2. Local-first PWA: offline, no server calls, no ads.
3. Favorites and recents persisted locally.
4. Tool chaining plus shareable deep links (URL state).
5. Smart clipboard detection.
6. A consistent tool UI contract, covering everyday categories that dev hubs skip.

## Extensibility patterns
- IT-Tools: a folder per tool, a central registry, and a scaffold script.
- CyberChef: composable operations, state in the URL.
- PowerToys: a manifest plus typed page kinds.
- Proposal: a typed tool manifest (id, name, category, keywords, icon, lazy component, I/O types), auto-discovered via `import.meta.glob`, driving the palette, the catalog and future pipelines.

## Licensing and privacy
- Do not copy IT-Tools code: it is GPL-3.0. DevToys (MIT) and CyberChef (Apache-2.0) need attribution.
- Currency-rate APIs have their own terms; this is a decision for later.
- Client-side only, with no accounts or analytics, means minimal privacy exposure.
