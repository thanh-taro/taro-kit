// SCR-Settings theme choice labels come from COPY-settings.theme (F-012.R2).
import { describe, expect, test } from 'vitest';
import { themeChoiceCopy } from '../../src/modules/pages/settings/theme-copy.ts';

describe('COPY-settings.theme', () => {
  test('F012_AC2 settings offers system, light and dark with labels from the copy', () => {
    expect(themeChoiceCopy()).toEqual({
      legend: 'Theme',
      options: [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
    });
  });

  test('a copy text without exactly three options fails the build', () => {
    expect(() => themeChoiceCopy('Theme: Light, Dark')).toThrow(/COPY-settings.theme/);
    expect(() => themeChoiceCopy('Theme')).toThrow(/COPY-settings.theme/);
  });
});
