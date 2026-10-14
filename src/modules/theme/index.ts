// MOD-Theme: resolves and applies the theme (RULE-03, F-012).
// Before first paint the inline script (inline.ts) sets data-theme (F-012.R4). After that, this module
// owns it: `preference` comes from MOD-PersonalData, `system` follows the device setting live through
// matchMedia (F-012.R1), and every change of `shownTheme` is applied to the root element at once (F-012.R2).
import { computed, effect, signal, type ReadonlySignal } from '@preact/signals';
import { personalData, type PersonalDataStore, type ThemePreference } from '../personal-data/index.ts';

export type { ThemePreference };
export type ShownTheme = 'light' | 'dark';

export interface ThemeEnvironment {
  store: PersonalDataStore;
  /** `window.matchMedia`; the device setting (RULE-03). */
  matchMedia: (query: string) => MediaQueryList;
  /** The element carrying `data-theme` (the root element). */
  root: Pick<Element, 'setAttribute'>;
}

export interface Theme {
  /** What the user chose: system, light or dark (F-012.R1). */
  readonly preference: ReadonlySignal<ThemePreference>;
  /** The theme on screen, never `system`. MOD-ToolHost hands this to embedded tools (F-012.R5). */
  readonly shownTheme: ReadonlySignal<ShownTheme>;
  setPreference(p: ThemePreference): void;
  /** RULE-03 quick toggle: the opposite of the theme showing, stored as an explicit choice (F-012.R3). */
  toggle(): void;
  dispose(): void;
}

// Same query and fallback as the inline script: dark unless the device asks for light.
const LIGHT_QUERY = '(prefers-color-scheme: light)';

export function createTheme(env: ThemeEnvironment): Theme {
  const media = env.matchMedia(LIGHT_QUERY);
  const system = signal<ShownTheme>(media.matches ? 'light' : 'dark');
  const onChange = (e: MediaQueryListEvent) => (system.value = e.matches ? 'light' : 'dark');
  media.addEventListener('change', onChange);

  const preference = computed<ThemePreference>(() => env.store.preferences.value.theme ?? 'system');
  const shownTheme = computed<ShownTheme>(() => (preference.value === 'system' ? system.value : preference.value));
  const stopApplying = effect(() => env.root.setAttribute('data-theme', shownTheme.value));

  return {
    preference,
    shownTheme,
    setPreference: (p) => env.store.setTheme(p),
    toggle: () => env.store.setTheme(shownTheme.peek() === 'dark' ? 'light' : 'dark'),
    dispose() {
      media.removeEventListener('change', onChange);
      stopApplying();
    },
  };
}

let shared: Theme | undefined;

/** The page's theme, shared by every island and script (browser only). */
export function theme(): Theme {
  shared ??= createTheme({
    store: personalData(),
    matchMedia: (q) => window.matchMedia(q),
    root: document.documentElement,
  });
  return shared;
}

/** The palette's theme action (F-004.R5) calls this; same behavior as the header toggle (RULE-03). */
export const toggleTheme = (): void => theme().toggle();
