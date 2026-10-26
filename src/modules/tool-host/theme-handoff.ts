// MOD-ToolHost: the theme and language hand-off to an embedded tool (F-012.R5, F-012.R6, ADR-0011; F-019.R7,
// ADR-0012). The language works exactly like the theme: `lang=en-US|vi-VN` in the `src`, { type: 'taro:language',
// value } on each change, and in the answer to ready (after the theme). Each value is tracked on its own, so a
// language switch posts only the language (F-019.AC12).
// - The frame's `src` carries `theme=light|dark`, the theme showing, never `system`.
// - Whenever the theme showing differs from the one the tool last got (first the one in its `src`),
//   it is posted as { type: 'taro:theme', value } to the tool's exact origin, never '*'.
// - A { type: 'taro:ready' } message is always answered with the theme showing (the tool may be a new document
//   that missed earlier messages), but only when it comes from the tool's origin and from this frame's own
//   window; everything else is ignored.
// - Delivery is idempotent: `told` is the last value posted (or the `src` theme), and a change is posted only
//   when it differs, so a ready answer followed by the same value never posts it twice. Callers connect before
//   the frame can load (ToolFrame uses a layout effect), so no change reaches the tool ahead of its ready.
// Only these two values are shared (D-039, the INV-05 exception). Linked tools and open-in-new-tab use the
// catalog URL as is (F-003).
// Its only import is import-free too, so the e2e stand-in loads both on their own (tests/fixtures/tool-host).
import { secureOrigin } from '../security-policy/origin.ts';

export type HandoffTheme = 'light' | 'dark';
export type HandoffLanguage = 'en-US' | 'vi-VN';

export const THEME_PARAM = 'theme';
export const LANGUAGE_PARAM = 'lang';
export const READY_MESSAGE = 'taro:ready';
export const THEME_MESSAGE = 'taro:theme';
export const LANGUAGE_MESSAGE = 'taro:language';

export interface ThemeMessage {
  type: typeof THEME_MESSAGE;
  value: HandoffTheme;
}

export interface LanguageMessage {
  type: typeof LANGUAGE_MESSAGE;
  value: HandoffLanguage;
}

/** A readable, subscribable value, such as MOD-Theme's `shownTheme` or MOD-Language's `shownLanguage` signal. */
export interface Source<T> {
  readonly value: T;
  /** Calls `fn` with the current value at once and on every change; returns an unsubscribe. */
  subscribe(fn: (value: T) => void): () => void;
}
export type ThemeSource = Source<HandoffTheme>;
export type LanguageSource = Source<HandoffLanguage>;

/** Runtime guard: only `light` or `dark` ever leaves the portal. */
export function assertHandoffTheme(value: unknown): HandoffTheme {
  if (value !== 'light' && value !== 'dark') throw new Error(`theme hand-off: invalid theme ${String(value)}`);
  return value;
}

/** Runtime guard: only `en-US` or `vi-VN` ever leaves the portal. */
export function assertHandoffLanguage(value: unknown): HandoffLanguage {
  if (value !== 'en-US' && value !== 'vi-VN') throw new Error(`language hand-off: invalid language ${String(value)}`);
  return value;
}

/**
 * The embedded frame's `src`: the tool's https address plus the theme and the language showing (F-012.R5,
 * F-019.R7, INV-02).
 */
export function embeddedSrc(toolUrl: string, theme: HandoffTheme, language: HandoffLanguage): string {
  secureOrigin(toolUrl, 'embedded tool');
  const url = new URL(toolUrl);
  url.searchParams.set(THEME_PARAM, assertHandoffTheme(theme));
  url.searchParams.set(LANGUAGE_PARAM, assertHandoffLanguage(language));
  return url.href;
}

export const themeMessage = (value: HandoffTheme): ThemeMessage => ({
  type: THEME_MESSAGE,
  value: assertHandoffTheme(value),
});

export const languageMessage = (value: HandoffLanguage): LanguageMessage => ({
  type: LANGUAGE_MESSAGE,
  value: assertHandoffLanguage(value),
});

export interface HandoffOptions {
  frame: { readonly contentWindow: Pick<Window, 'postMessage'> | null };
  /** The tool's catalog URL; its origin is the only one ever talked to. */
  toolUrl: string;
  /** The theme put into the frame's `src` (embeddedSrc); nothing is sent while it is still the one showing. */
  srcTheme: HandoffTheme;
  theme: ThemeSource;
  /** The language put into the frame's `src`. */
  srcLanguage: HandoffLanguage;
  language: LanguageSource;
  /** The portal window that receives the tool's messages. */
  host: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** Wires the hand-off for one embedded frame; returns a function that stops it. */
export function connectThemeHandoff({
  frame,
  toolUrl,
  srcTheme,
  theme,
  srcLanguage,
  language,
  host,
}: HandoffOptions): () => void {
  const toolOrigin = secureOrigin(toolUrl, 'embedded tool');
  let told = assertHandoffTheme(srcTheme);
  let toldLanguage = assertHandoffLanguage(srcLanguage);
  const send = (value: HandoffTheme) => {
    told = value;
    frame.contentWindow?.postMessage(themeMessage(value), toolOrigin);
  };
  const sendLanguage = (value: HandoffLanguage) => {
    toldLanguage = value;
    frame.contentWindow?.postMessage(languageMessage(value), toolOrigin);
  };

  // F-012.R6: answer only the tool's own frame, from the tool's own origin.
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== toolOrigin) return;
    if (!frame.contentWindow || event.source !== frame.contentWindow) return;
    const data: unknown = event.data;
    if (typeof data === 'object' && data !== null && (data as { type?: unknown }).type === READY_MESSAGE) {
      send(theme.value);
      sendLanguage(language.value);
    }
  };
  host.addEventListener('message', onMessage as EventListener);

  // F-012.R5: send when the theme showing differs from what the tool has, including on the first call
  // (the theme may have changed between building the `src` and connecting).
  const unsubscribe = theme.subscribe((value) => {
    if (value !== told) send(value);
  });
  // F-019.R7: the same for the language showing.
  const unsubscribeLanguage = language.subscribe((value) => {
    if (value !== toldLanguage) sendLanguage(value);
  });

  return () => {
    host.removeEventListener('message', onMessage as EventListener);
    unsubscribe();
    unsubscribeLanguage();
  };
}
