// MOD-ToolHost theme hand-off helpers (F-012.R5, F-012.R6, ADR-0011) against a fake window and frame.
// AC5, AC9 and AC10 need the real tool view and its open links, so F-003 verifies them.
import { signal } from '@preact/signals';
import { describe, expect, test } from 'vitest';
import { createPersonalDataStore } from '../../src/modules/personal-data/index.ts';
import { createTheme } from '../../src/modules/theme/index.ts';
import { connectThemeHandoff, embeddedSrc, type HandoffTheme } from '../../src/modules/tool-host/index.ts';
import { FakeMedia, FakeRoot } from './fakes.ts';

const TOOL_URL = 'https://json.tarokit.app/';
const TOOL_ORIGIN = 'https://json.tarokit.app';
const themeSent = (value: HandoffTheme) => ({ message: { type: 'taro:theme', value }, targetOrigin: TOOL_ORIGIN });

/** A frame's window that records what the portal posts to it. */
class FakeFrameWindow {
  sent: { message: unknown; targetOrigin: string }[] = [];
  postMessage(message: unknown, targetOrigin: string) {
    this.sent.push({ message, targetOrigin });
  }
}

function setup(initial: HandoffTheme = 'dark', srcTheme: HandoffTheme = initial) {
  const host = new EventTarget();
  const tool = new FakeFrameWindow();
  const frame = { contentWindow: tool as unknown as Window };
  const shown = signal<HandoffTheme>(initial);
  const stop = connectThemeHandoff({
    frame,
    toolUrl: TOOL_URL,
    srcTheme,
    theme: shown,
    host: host as unknown as Window,
  });
  // Node's MessageEvent only accepts a MessagePort as source, so the browser fields are set on a plain event.
  const receive = (data: unknown, origin: string, source: unknown) =>
    host.dispatchEvent(Object.assign(new Event('message'), { data, origin, source }));
  return { host, tool, frame, shown, stop, receive };
}

/** The real MOD-Theme over a fake device, handing off to a fake frame. */
function realTheme(deviceLight: boolean) {
  const media = new FakeMedia(deviceLight);
  const store = createPersonalDataStore({ storage: () => null });
  const theme = createTheme({ store, matchMedia: () => media as unknown as MediaQueryList, root: new FakeRoot() });
  const tool = new FakeFrameWindow();
  connectThemeHandoff({
    frame: { contentWindow: tool as unknown as Window },
    toolUrl: TOOL_URL,
    srcTheme: theme.shownTheme.value,
    theme: theme.shownTheme,
    host: new EventTarget() as unknown as Window,
  });
  return { media, theme, tool };
}

describe('embeddedSrc (F-012.R5)', () => {
  test('adds the theme showing to the tool address, keeping its query and fragment', () => {
    expect(embeddedSrc(TOOL_URL, 'dark')).toBe('https://json.tarokit.app/?theme=dark');
    expect(embeddedSrc('https://units.tarokit.app/app/?lang=en#top', 'light')).toBe(
      'https://units.tarokit.app/app/?lang=en&theme=light#top',
    );
  });

  test('refuses an insecure tool address (INV-02) and anything but light or dark', () => {
    expect(() => embeddedSrc('http://json.tarokit.app/', 'dark')).toThrow(/not a secure origin/);
    expect(() => embeddedSrc(TOOL_URL, 'system' as HandoffTheme)).toThrow(/invalid theme/);
  });
});

describe('connectThemeHandoff (F-012.R5, F-012.R6)', () => {
  test('F012_AC6 a toggle posts only the new theme, only to the tool origin', () => {
    const { tool, shown } = setup('dark');
    expect(tool.sent).toEqual([]);
    shown.value = 'light';
    expect(tool.sent).toEqual([themeSent('light')]);
    expect(Object.keys(tool.sent[0].message as object)).toEqual(['type', 'value']);
  });

  test('F012_AC6 with the real theme: the header toggle reaches the tool without reloading', () => {
    const { theme, tool } = realTheme(false);
    theme.toggle();
    expect(tool.sent).toEqual([themeSent('light')]);
  });

  test('F012_AC7 a ready message from the tool frame and origin gets the theme showing', () => {
    const { tool, shown, receive } = setup('dark');
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([themeSent('dark')]);
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent.at(-1)).toEqual(themeSent('light'));
  });

  test('F012_AC7 a ready message from another origin or another window gets nothing', () => {
    const { tool, receive } = setup('dark');
    receive({ type: 'taro:ready' }, 'https://evil.example', tool);
    receive({ type: 'taro:ready' }, 'https://units.tarokit.app', tool);
    receive({ type: 'taro:ready' }, 'http://json.tarokit.app', tool);
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, new FakeFrameWindow());
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, null);
    receive({ type: 'something-else' }, TOOL_ORIGIN, tool);
    receive('taro:ready', TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([]);
  });

  test('F012_AC8 on system, a device switch from dark to light reaches the tool', () => {
    const { media, tool } = realTheme(false);
    media.set(true);
    expect(tool.sent).toEqual([themeSent('light')]);
  });

  test('a theme change between building the src and connecting is sent at once', () => {
    const { tool } = setup('light', 'dark');
    expect(tool.sent).toEqual([themeSent('light')]);
  });

  test('nothing is sent while the theme showing is still the one in the src', () => {
    const { tool, shown } = setup('dark');
    shown.value = 'light';
    shown.value = 'dark';
    expect(tool.sent).toEqual([themeSent('light'), themeSent('dark')]);
  });

  test('an insecure tool address is refused', () => {
    const shown = signal<HandoffTheme>('dark');
    expect(() =>
      connectThemeHandoff({
        frame: { contentWindow: null },
        toolUrl: 'http://json.tarokit.app/',
        srcTheme: 'dark',
        theme: shown,
        host: new EventTarget() as unknown as Window,
      }),
    ).toThrow(/not a secure origin/);
  });

  test('stopping the hand-off removes the listener and the subscription', () => {
    const { tool, shown, stop, receive } = setup('dark');
    stop();
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([]);
  });

  test('a frame without a window yet is skipped quietly', () => {
    const shown = signal<HandoffTheme>('dark');
    connectThemeHandoff({
      frame: { contentWindow: null },
      toolUrl: TOOL_URL,
      srcTheme: 'dark',
      theme: shown,
      host: new EventTarget() as unknown as Window,
    });
    expect(() => (shown.value = 'light')).not.toThrow();
  });
});
