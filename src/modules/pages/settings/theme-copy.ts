// SCR-Settings: COPY-settings.theme holds the label and the three options in one string,
// "Theme: System, Light, Dark". This splits it, in the RULE-03 order system, light, dark.
import { t } from '../../copy/index.ts';
import type { ThemePreference } from '../../personal-data/index.ts';

const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function themeChoiceCopy(text: string = t('COPY-settings.theme')) {
  const [legend, list] = text.split(/:\s*/, 2);
  const labels = (list ?? '').split(/,\s*/).filter(Boolean);
  if (!legend || labels.length !== ORDER.length) {
    throw new Error(`COPY-settings.theme must read "<label>: <system>, <light>, <dark>", got "${text}"`);
  }
  return { legend, options: ORDER.map((value, i) => ({ value, label: labels[i] })) };
}
