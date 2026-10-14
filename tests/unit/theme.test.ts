// MOD-Theme (F-012.R1–R4, RULE-03): preference, live system-follow, quick toggle, and the inline script.
import { describe, expect, test } from 'vitest';
import { createPersonalDataStore, emptyDocument, STORAGE_KEY } from '../../src/modules/personal-data/index.ts';
import { createTheme } from '../../src/modules/theme/index.ts';
import { themeInlineScript } from '../../src/modules/theme/inline.ts';
import { FakeMedia, FakeRoot, FakeStorage } from './fakes.ts';

/** A theme over a fake device: `deviceLight` is the device's light/dark setting. */
function setup({ deviceLight, stored }: { deviceLight: boolean; stored?: 'system' | 'light' | 'dark' }) {
  const storage = new FakeStorage();
  if (stored) storage.setItem(STORAGE_KEY, JSON.stringify({ ...emptyDocument(), preferences: { theme: stored } }));
  const media = new FakeMedia(deviceLight);
  const root = new FakeRoot();
  const store = createPersonalDataStore({ storage: () => storage });
  const theme = createTheme({ store, matchMedia: () => media as unknown as MediaQueryList, root });
  const storedTheme = () => JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')?.preferences?.theme;
  return { storage, media, root, theme, storedTheme };
}

describe('F-012 theme', () => {
  test('F012_AC1 system follows a dark device, then switches live when the device turns light', () => {
    const { media, root, theme } = setup({ deviceLight: false });
    expect(theme.preference.value).toBe('system');
    expect(theme.shownTheme.value).toBe('dark');
    expect(root.theme).toBe('dark');
    media.set(true);
    expect(theme.shownTheme.value).toBe('light');
    expect(root.theme).toBe('light');
  });

  test('a device with no light/dark preference shows dark (dark-first, D-019)', () => {
    // matchMedia('(prefers-color-scheme: light)') is false both for dark and for no preference.
    const { root, theme } = setup({ deviceLight: false });
    expect(theme.shownTheme.value).toBe('dark');
    expect(root.theme).toBe('dark');
  });

  test('F012_AC1 an explicit choice ignores device changes (RULE-03)', () => {
    const { media, root } = setup({ deviceLight: false, stored: 'dark' });
    media.set(true);
    expect(root.theme).toBe('dark');
  });

  test('F012_AC2 picking dark while light applies at once and is stored', () => {
    const { root, theme, storedTheme } = setup({ deviceLight: true, stored: 'light' });
    expect(root.theme).toBe('light');
    theme.setPreference('dark');
    expect(root.theme).toBe('dark');
    expect(theme.preference.value).toBe('dark');
    expect(storedTheme()).toBe('dark');
  });

  test('F012_AC3 the toggle on system-dark shows light and stores light', () => {
    const { root, theme, storedTheme } = setup({ deviceLight: false });
    theme.toggle();
    expect(root.theme).toBe('light');
    expect(theme.preference.value).toBe('light');
    expect(storedTheme()).toBe('light');
    theme.toggle();
    expect(storedTheme()).toBe('dark');
  });

  test('F012_AC3 the toggle flips relative to the theme showing, not the stored choice (RULE-03)', () => {
    const { theme, storedTheme } = setup({ deviceLight: true, stored: 'system' });
    expect(theme.shownTheme.value).toBe('light');
    theme.toggle();
    expect(storedTheme()).toBe('dark');
  });

  test('F-012 edge case: without storage the theme follows the system and a choice lasts the session', () => {
    const media = new FakeMedia(true);
    const root = new FakeRoot();
    const store = createPersonalDataStore({ storage: () => null });
    const theme = createTheme({ store, matchMedia: () => media as unknown as MediaQueryList, root });
    expect(root.theme).toBe('light');
    theme.toggle();
    expect(root.theme).toBe('dark');
    expect(store.storageAvailable.value).toBe(false);
  });

  test('dispose stops following the device', () => {
    const { media, root, theme } = setup({ deviceLight: false });
    theme.dispose();
    media.set(true);
    expect(root.theme).toBe('dark');
  });
});

describe('F-012.R4 inline script', () => {
  /** Runs the inline script against a fake page and returns the data-theme it set. */
  function run(stored: string | null, deviceLight: boolean, storageThrows = false): string | undefined {
    const root = new FakeRoot();
    const localStorage = {
      getItem: (k: string) => {
        if (storageThrows) throw new DOMException('denied', 'SecurityError');
        return k === STORAGE_KEY ? stored : null;
      },
    };
    const matchMedia = (q: string) => ({ matches: q === '(prefers-color-scheme: light)' && deviceLight });
    new Function('localStorage', 'matchMedia', 'document', themeInlineScript)(localStorage, matchMedia, {
      documentElement: root,
    });
    return root.theme;
  }
  const doc = (theme: string) => JSON.stringify({ ...emptyDocument(), preferences: { theme } });

  test('F012_AC4 a stored dark choice is applied before anything paints, even on a light device', () => {
    expect(run(doc('dark'), true)).toBe('dark');
    expect(run(doc('light'), false)).toBe('light');
  });

  test('system, nothing stored, damaged or unavailable storage all follow the device', () => {
    expect(run(doc('system'), true)).toBe('light');
    expect(run(null, false)).toBe('dark');
    expect(run('{oops', true)).toBe('light');
    expect(run(null, true, true)).toBe('light');
  });
});
