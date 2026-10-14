// SCR-Settings theme choice labels come from their COPY IDs (F-012.R2).
import { describe, expect, test } from 'vitest';
import { t } from '../../src/modules/copy/index.ts';

describe('SCR-Settings theme copy', () => {
  test('the legend and the three choices have their own COPY IDs', () => {
    expect(t('COPY-settings.theme')).toBe('Theme');
    expect([t('COPY-settings.themeSystem'), t('COPY-settings.themeLight'), t('COPY-settings.themeDark')]).toEqual([
      'System',
      'Light',
      'Dark',
    ]);
  });

  test('the page has its own title and description', () => {
    expect(t('COPY-meta.settingsTitle')).toBe('Settings — TaroKit');
    expect(t('COPY-meta.settingsDescription').length).toBeGreaterThan(0);
  });
});
