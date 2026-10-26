// MOD-PersonalData `readStoredTheme()`: the stored theme preference, read synchronously (ADR-0010).
// MOD-Theme inlines this function's source into the blocking head script with `.toString()`, so it must
// stay self-contained: no imports, no outer variables, only browser globals. The key literal equals
// STORAGE_KEY (a unit test keeps them in step).
export function readStoredTheme(): 'system' | 'light' | 'dark' {
  try {
    const doc = JSON.parse(localStorage.getItem('tarokit.personal') || 'null');
    const theme = doc && doc.preferences && doc.preferences.theme;
    if (theme === 'light' || theme === 'dark') return theme;
  } catch {
    // Unreadable or unavailable storage: follow the system (F-012 edge case).
  }
  return 'system';
}

// MOD-PersonalData `readStoredLanguage()`: the stored language choice, read synchronously (ADR-0010 note, F-019).
// MOD-Language inlines its source into the blocking script, so the same rules apply: self-contained, no imports.
export function readStoredLanguage(): 'en-US' | 'vi-VN' | undefined {
  try {
    const doc = JSON.parse(localStorage.getItem('tarokit.personal') || 'null');
    const language = doc && doc.preferences && doc.preferences.language;
    if (language === 'en-US' || language === 'vi-VN') return language;
  } catch {
    // Unreadable or unavailable storage: follow the device (F-019 edge case).
  }
  return undefined;
}
