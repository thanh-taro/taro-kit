// MOD-Theme: the blocking script that sets data-theme before first paint (F-012.R4, ADR-0010).
// It inlines MOD-PersonalData's readStoredTheme() source, and resolves `system` against the device:
// light only when the device asks for light, otherwise dark, so a device with no preference gets the
// dark-first default (D-019). It also gives the theme-color metas that theme's color (theme-color.ts). Kept as a
// source string so the layout can hash it for the CSP.
import { readStoredTheme } from '../personal-data/index.ts';
import { THEME_COLORS } from './theme-color.ts';

export const themeInlineScript =
  `(function(){var t=(${readStoredTheme.toString()})();` +
  `if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';` +
  `document.documentElement.setAttribute('data-theme',t);` +
  `var c=${JSON.stringify(THEME_COLORS)}[t];` +
  `document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',c)})})()`;
