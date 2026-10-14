// MOD-ToolHost theme hand-off (F-012.R5, F-012.R6, ADR-0011) against a fake window and frame.
import { signal } from '@preact/signals';
import { describe, expect, test } from 'vitest';
import { createPersonalDataStore } from '../../src/modules/personal-data/index.ts';
import { createTheme } from '../../src/modules/theme/index.ts';
import { connectThemeHandoff, directHref, embeddedSrc } from '../../src/modules/tool-host/index.ts';
import { FakeMedia, FakeRoot } from './fakes.ts';

const TOOL_URL = 'https://json.tarokit.app/';
const TOOL_ORIGIN = 'https://json.tarokit.app';

/** A frame's window that records what the portal posts to it. */
class FakeFrameWindow {
  sent: { message: unknown; targetOrigin: string }[] = [];
  postMessage(message: unknown, targetOrigin: string) {
    this.sent.push({ message, targetOrigin });
  }
}

function setup(initial: 'light' | 'dark' = 'dark') {
  const host = new EventTarget();
  const tool = new FakeFrameWindow();
  const frame = { contentWindow: tool as unknown as Window };
  const shown = signal<'light' | 'dark'>(initial);
  const stop = connectThemeHandoff({ frame, toolUrl: TOOL_URL, theme: shown, host: host as unknown as Window });
  const receive = (data: unknown, origin: string, source: unknown) =>
    // Node's MessageEvent only accepts a MessagePort as source, so the browser fields are set on a plain event.
    host.dispatchEvent(Object.assign(new Event('message'), { data, origin, source }));
  return { host, tool, frame, shown, stop, receive };
}

describe('F-012 theme hand-off', () => {
  test('F012_AC5 the embedded src carries the dark theme showing', () => {
    expect(embeddedSrc(TOOL_URL, 'dark')).toBe('https://json.tarokit.app/?theme=dark');
    expect(embeddedSrc('https://units.tarokit.app/app/?lang=en#top', 'light')).toBe(
      'https://units.tarokit.app/app/?lang=en&theme=light#top',
    );
  });

  test('F012_AC6 a toggle posts only the new theme, only to the tool origin', () => {
    const { tool, shown } = setup('dark');
    expect(tool.sent).toEqual([]);
    shown.value = 'light';
    expect(tool.sent).toEqual([{ message: { type: 'taro:theme', value: 'light' }, targetOrigin: TOOL_ORIGIN }]);
    expect(Object.keys(tool.sent[0].message as object)).toEqual(['type', 'value']);
  });

  test('F012_AC6 with the real theme: the header toggle reaches the tool without reloading', () => {
    const store = createPersonalDataStore({ storage: () => null });
    const theme = createTheme({
      store,
      matchMedia: () => new FakeMedia(false) as unknown as MediaQueryList,
      root: new FakeRoot(),
    });
    const tool = new FakeFrameWindow();
    connectThemeHandoff({
      frame: { contentWindow: tool as unknown as Window },
      toolUrl: TOOL_URL,
      theme: theme.shownTheme,
      host: new EventTarget() as unknown as Window,
    });
    theme.toggle();
    expect(tool.sent).toEqual([{ message: { type: 'taro:theme', value: 'light' }, targetOrigin: TOOL_ORIGIN }]);
  });

  test('F012_AC7 a ready message from the tool frame and origin gets the theme showing', () => {
    const { tool, shown, receive } = setup('dark');
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([{ message: { type: 'taro:theme', value: 'dark' }, targetOrigin: TOOL_ORIGIN }]);
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent.at(-1)).toEqual({ message: { type: 'taro:theme', value: 'light' }, targetOrigin: TOOL_ORIGIN });
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
    const media = new FakeMedia(false);
    const store = createPersonalDataStore({ storage: () => null });
    const theme = createTheme({ store, matchMedia: () => media as unknown as MediaQueryList, root: new FakeRoot() });
    const tool = new FakeFrameWindow();
    connectThemeHandoff({
      frame: { contentWindow: tool as unknown as Window },
      toolUrl: TOOL_URL,
      theme: theme.shownTheme,
      host: new EventTarget() as unknown as Window,
    });
    media.set(true);
    expect(tool.sent).toEqual([{ message: { type: 'taro:theme', value: 'light' }, targetOrigin: TOOL_ORIGIN }]);
  });

  test('F012_AC9 a tool that never says ready still gets the theme in its address and nothing is required', () => {
    const { tool } = setup('dark');
    expect(new URL(embeddedSrc(TOOL_URL, 'dark')).searchParams.get('theme')).toBe('dark');
    expect(tool.sent).toEqual([]);
  });

  test('F012_AC10 linked and open-in-new-tab addresses carry no theme', () => {
    expect(directHref(TOOL_URL)).toBe(TOOL_URL);
    expect(new URL(directHref('https://units.tarokit.app/?lang=en')).searchParams.has('theme')).toBe(false);
  });

  test('stopping the hand-off removes the listener and the subscription', () => {
    const { tool, shown, stop, receive } = setup('dark');
    stop();
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([]);
  });

  test('a frame without a window yet is skipped quietly', () => {
    const host = new EventTarget();
    const shown = signal<'light' | 'dark'>('dark');
    connectThemeHandoff({
      frame: { contentWindow: null },
      toolUrl: TOOL_URL,
      theme: shown,
      host: host as unknown as Window,
    });
    expect(() => (shown.value = 'light')).not.toThrow();
  });
});
