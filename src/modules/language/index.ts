// MOD-Language: resolves and applies the language showing (RULE-16, F-019, ADR-0012).
// Before first paint the blocking script (inline.ts) has set `lang`/`data-lang` on <html>, the title and the localized
// attributes. After that this module owns them:
// - `choice` comes from MOD-PersonalData (`preferences.language`); with none, the device's preferred languages decide
//   (read once per page: a device change while a page is open is not followed, F-019 scope).
// - Every change of `shownLanguage` is applied at once: the two root attributes (CSS then shows the other text of
//   every <L>, so DOM, focus, scroll and typed text are untouched), the page title, and every localized attribute.
//   Islands re-render what they compute (`useShownLanguage`).
// - `setLanguage(lang | null)` (settings; null follows the device) and `switchLanguage()` (the header switch, the
//   palette action) store the choice. With storage unavailable it lasts for this page only (F-019.AC22).
// - `connectLanguageSwitch()`: one delegated click listener for every `[data-tk-language-switch]` control.
// Implements: F-019.R1, F-019.R2, F-019.R3 (with inline.ts), F-019.R4 (declaring the language).
import { computed, effect, type ReadonlySignal } from '@preact/signals';
import { personalData, type PersonalDataStore } from '../personal-data/index.ts';
import { swapLocalizedAttributes } from './attrs.ts';
import { otherLanguage, type Lang } from './languages.ts';
import { resolveLanguage } from './resolve.ts';
import { LANGUAGE_SWITCH_ATTR } from './switch-attr.ts';

export { LANGUAGE_SWITCH_ATTR, resolveLanguage, swapLocalizedAttributes };
export * from './languages.ts';

export interface LanguageEnvironment {
  store: PersonalDataStore;
  /** The device's preferred languages (`navigator.languages`, platform-mapping). */
  device: () => readonly string[];
  /** The document whose root, title and localized attributes follow the language showing. */
  doc?: Document;
}

export interface Language {
  /** The stored choice, or undefined when the language follows the device (RULE-16). */
  readonly choice: ReadonlySignal<Lang | undefined>;
  /** The language on screen. MOD-ToolHost hands it to embedded tools (F-019.R7). */
  readonly shownLanguage: ReadonlySignal<Lang>;
  /** F-019.R2: store a choice, or `null` to follow the device. */
  setLanguage(lang: Lang | null): void;
  /** F-019.R2: switch to the other language and store it (the header switch, the palette action). */
  switchLanguage(): void;
  dispose(): void;
}

/** Applies `lang` to a document: root attributes, title and localized attributes (ADR-0012). */
export function applyLanguage(doc: Document, lang: Lang): void {
  const root = doc.documentElement;
  if (root.getAttribute('lang') !== lang) root.setAttribute('lang', lang);
  if (root.getAttribute('data-lang') !== lang) root.setAttribute('data-lang', lang);
  const title = doc.querySelector('title')?.getAttribute(`data-l-${lang}`);
  if (title && doc.title !== title) doc.title = title;
  swapLocalizedAttributes(doc, lang);
}

export function createLanguage(env: LanguageEnvironment): Language {
  const device = env.device();
  const choice = computed<Lang | undefined>(() => env.store.preferences.value.language);
  const shownLanguage = computed<Lang>(() => resolveLanguage(choice.value, device));
  const stop = env.doc ? effect(() => applyLanguage(env.doc!, shownLanguage.value)) : () => {};
  return {
    choice,
    shownLanguage,
    setLanguage: (lang) => env.store.setLanguage(lang),
    switchLanguage: () => env.store.setLanguage(otherLanguage(shownLanguage.peek())),
    dispose: stop,
  };
}

const deviceLanguages = (): readonly string[] =>
  navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];

let shared: Language | undefined;

/** The page's language, shared by every island and script (browser only). */
export function language(): Language {
  shared ??= createLanguage({ store: personalData(), device: deviceLanguages, doc: document });
  return shared;
}

/** F-019.R2: every `[data-tk-language-switch]` control switches the language; focus stays on it. */
export function connectLanguageSwitch(doc: Document = document): () => void {
  const onClick = (e: Event) => {
    const target = e.target instanceof Element ? e.target.closest(`[${LANGUAGE_SWITCH_ATTR}]`) : null;
    if (!target) return;
    e.preventDefault();
    language().switchLanguage();
    // Safari doesn't focus a clicked button; focus stays on the switch in every engine (F-019.R2).
    if (target instanceof HTMLElement && target.ownerDocument.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
  };
  doc.addEventListener('click', onClick);
  return () => doc.removeEventListener('click', onClick);
}
