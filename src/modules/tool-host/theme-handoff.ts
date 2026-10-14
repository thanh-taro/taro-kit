// MOD-ToolHost: the theme hand-off to an embedded tool (F-012.R5, F-012.R6, ADR-0011).
// - The frame's `src` carries `theme=light|dark`, the theme showing, never `system`.
// - Whenever the theme showing differs from the one the tool last got (first the one in its `src`),
//   it is posted as { type: 'taro:theme', value } to the tool's exact origin, never '*'.
// - A { type: 'taro:ready' } message is answered the same way, but only when it comes from the tool's
//   origin and from this frame's own window; everything else is ignored.
// Only this one value is shared (D-039, the INV-05 exception). Linked tools and open-in-new-tab use the
// catalog URL as is (F-003).
// Its only import is import-free too, so the e2e stand-in loads both on their own (tests/fixtures/tool-host).
import { secureOrigin } from '../security-policy/origin.ts';

export type HandoffTheme = 'light' | 'dark';

export const THEME_PARAM = 'theme';
export const READY_MESSAGE = 'taro:ready';
export const THEME_MESSAGE = 'taro:theme';

export interface ThemeMessage {
  type: typeof THEME_MESSAGE;
  value: HandoffTheme;
}

/** A readable, subscribable theme, such as MOD-Theme's `shownTheme` signal. */
export interface ThemeSource {
  readonly value: HandoffTheme;
  /** Calls `fn` with the current value at once and on every change; returns an unsubscribe. */
  subscribe(fn: (value: HandoffTheme) => void): () => void;
}

/** Runtime guard: only `light` or `dark` ever leaves the portal. */
export function assertHandoffTheme(value: unknown): HandoffTheme {
  if (value !== 'light' && value !== 'dark') throw new Error(`theme hand-off: invalid theme ${String(value)}`);
  return value;
}

/** The embedded frame's `src`: the tool's https address plus the theme showing (F-012.R5, INV-02). */
export function embeddedSrc(toolUrl: string, theme: HandoffTheme): string {
  secureOrigin(toolUrl, 'embedded tool');
  const url = new URL(toolUrl);
  url.searchParams.set(THEME_PARAM, assertHandoffTheme(theme));
  return url.href;
}

export const themeMessage = (value: HandoffTheme): ThemeMessage => ({
  type: THEME_MESSAGE,
  value: assertHandoffTheme(value),
});

export interface HandoffOptions {
  frame: { readonly contentWindow: Pick<Window, 'postMessage'> | null };
  /** The tool's catalog URL; its origin is the only one ever talked to. */
  toolUrl: string;
  /** The theme put into the frame's `src` (embeddedSrc); nothing is sent while it is still the one showing. */
  srcTheme: HandoffTheme;
  theme: ThemeSource;
  /** The portal window that receives the tool's messages. */
  host: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** Wires the hand-off for one embedded frame; returns a function that stops it. */
export function connectThemeHandoff({ frame, toolUrl, srcTheme, theme, host }: HandoffOptions): () => void {
  const toolOrigin = secureOrigin(toolUrl, 'embedded tool');
  let told = assertHandoffTheme(srcTheme);
  const send = (value: HandoffTheme) => {
    told = value;
    frame.contentWindow?.postMessage(themeMessage(value), toolOrigin);
  };

  // F-012.R6: answer only the tool's own frame, from the tool's own origin.
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== toolOrigin) return;
    if (!frame.contentWindow || event.source !== frame.contentWindow) return;
    const data: unknown = event.data;
    if (typeof data === 'object' && data !== null && (data as { type?: unknown }).type === READY_MESSAGE) {
      send(theme.value);
    }
  };
  host.addEventListener('message', onMessage as EventListener);

  // F-012.R5: send when the theme showing differs from what the tool has, including on the first call
  // (the theme may have changed between building the `src` and connecting).
  const unsubscribe = theme.subscribe((value) => {
    if (value !== told) send(value);
  });

  return () => {
    host.removeEventListener('message', onMessage as EventListener);
    unsubscribe();
  };
}
