// MOD-Theme: the blocking head script that sets data-theme before first paint (F-012.R4, ADR-0010).
// It reads the stored preference from the personal-data document (STORAGE_KEY) and resolves `system`
// against the device setting (RULE-03). Kept as a source string so the layout can hash it for the CSP.
import { STORAGE_KEY } from '../personal-data/theme-preference.ts';

export const themeInlineScript =
  `(function(){var t='system';try{var d=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'null');` +
  `var p=d&&d.preferences&&d.preferences.theme;if(p==='light'||p==='dark')t=p}catch(e){}` +
  `if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';` +
  `document.documentElement.setAttribute('data-theme',t)})()`;
