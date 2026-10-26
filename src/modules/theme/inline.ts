// MOD-Theme: the blocking script that sets data-theme before first paint (F-012.R4, ADR-0010).
// It inlines MOD-PersonalData's readStoredTheme() source, and resolves `system` against the device:
// light only when the device asks for light, otherwise dark, so a device with no preference gets the
// dark-first default (D-019). It also gives the theme-color metas that theme's color (theme-color.ts). Kept as a
// source string so the layout can hash it for the CSP. MOD-Language's part (F-019.R3, ADR-0012) follows it in the same
// script, so one CSP hash covers both. The theme part is guarded, so an error in it can't stop the language part
// (security review F-019 L-2).
import { readStoredTheme } from '../personal-data/index.ts';
import { languageInlineScript } from '../language/inline.ts';
import { THEME_COLORS } from './theme-color.ts';

export const themeInlineScript =
  `(function(){try{var t=(${readStoredTheme.toString()})();` +
  `if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';` +
  `document.documentElement.setAttribute('data-theme',t);` +
  `var c=${JSON.stringify(THEME_COLORS)}[t];` +
  `document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)})}catch(e){}})();` +
  languageInlineScript;
