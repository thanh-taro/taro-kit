// MOD-ToolHost: the theme hand-off to an embedded tool (F-012.R5, F-012.R6, ADR-0011).
// - The frame's `src` carries `theme=light|dark`, the theme showing, never `system`.
// - Every later change of the theme showing is posted as { type: 'taro:theme', value } to the tool's
//   exact origin, never '*'.
// - A { type: 'taro:ready' } message is answered the same way, but only when it comes from the tool's
//   origin and from this frame's own window; everything else is ignored.
// Only this one value is shared (D-039, the INV-05 exception). Linked tools and the open-in-new-tab
// address use the catalog URL as is, with no theme.
// Deliberately free of imports: the e2e fixture loads this file on its own (tests/fixtures/tool-host).

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

/** The embedded frame's `src`: the tool's address plus the theme showing (F-012.R5). */
export function embeddedSrc(toolUrl: string, theme: HandoffTheme): string {
  const url = new URL(toolUrl);
  url.searchParams.set(THEME_PARAM, theme);
  return url.href;
}

/** The address for a linked tool or open-in-new-tab: the catalog URL, never with a theme (F-012.R5). */
export const directHref = (toolUrl: string): string => toolUrl;

export const themeMessage = (value: HandoffTheme): ThemeMessage => ({ type: THEME_MESSAGE, value });

export interface HandoffOptions {
  frame: { readonly contentWindow: Pick<Window, 'postMessage'> | null };
  /** The tool's catalog URL; its origin is the only one ever talked to. */
  toolUrl: string;
  theme: ThemeSource;
  /** The portal window that receives the tool's messages. */
  host: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** Wires the hand-off for one embedded frame; returns a function that stops it. */
export function connectThemeHandoff({ frame, toolUrl, theme, host }: HandoffOptions): () => void {
  const toolOrigin = new URL(toolUrl).origin;
  const send = (value: HandoffTheme) => frame.contentWindow?.postMessage(themeMessage(value), toolOrigin);

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

  // F-012.R5: re-send on every change. The first call is the value already in the `src`, so it is skipped.
  let initial = true;
  const unsubscribe = theme.subscribe((value) => {
    if (initial) {
      initial = false;
      return;
    }
    send(value);
  });

  return () => {
    host.removeEventListener('message', onMessage as EventListener);
    unsubscribe();
  };
}
