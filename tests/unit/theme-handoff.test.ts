// MOD-ToolHost theme and language hand-off helpers (F-012.R5, F-012.R6, ADR-0011; F-019.R7, ADR-0012) against a
// fake window and frame.
// AC5, AC9 and AC10 need the real tool view and its open links, so F-003 verifies them.
import { signal } from '@preact/signals';
import { describe, expect, test } from 'vitest';
import { createPersonalDataStore } from '../../src/modules/personal-data/index.ts';
import { createTheme } from '../../src/modules/theme/index.ts';
import {
  connectThemeHandoff,
  embeddedSrc,
  type HandoffLanguage,
  type HandoffTheme,
} from '../../src/modules/tool-host/index.ts';
import { FakeMedia, FakeRoot } from './fakes.ts';

const TOOL_URL = 'https://json.tarokit.app/';
const TOOL_ORIGIN = 'https://json.tarokit.app';
const themeSent = (value: HandoffTheme) => ({ message: { type: 'taro:theme', value }, targetOrigin: TOOL_ORIGIN });
const langSent = (value: HandoffLanguage) => ({ message: { type: 'taro:language', value }, targetOrigin: TOOL_ORIGIN });
/** The answer to ready: the theme showing, then the language showing (F-019.R7). */
const readyAnswer = (theme: HandoffTheme, lang: HandoffLanguage = 'en-US') => [themeSent(theme), langSent(lang)];

/** A frame's window that records what the portal posts to it. */
class FakeFrameWindow {
  sent: { message: unknown; targetOrigin: string }[] = [];
  postMessage(message: unknown, targetOrigin: string) {
    this.sent.push({ message, targetOrigin });
  }
}

function setup(
  initial: HandoffTheme = 'dark',
  srcTheme: HandoffTheme = initial,
  initialLanguage: HandoffLanguage = 'en-US',
  srcLanguage: HandoffLanguage = initialLanguage,
) {
  const host = new EventTarget();
  const tool = new FakeFrameWindow();
  const frame = { contentWindow: tool as unknown as Window };
  const shown = signal<HandoffTheme>(initial);
  const lang = signal<HandoffLanguage>(initialLanguage);
  const stop = connectThemeHandoff({
    frame,
    toolUrl: TOOL_URL,
    srcTheme,
    theme: shown,
    srcLanguage,
    language: lang,
    host: host as unknown as Window,
  });
  // Node's MessageEvent only accepts a MessagePort as source, so the browser fields are set on a plain event.
  const receive = (data: unknown, origin: string, source: unknown) =>
    host.dispatchEvent(Object.assign(new Event('message'), { data, origin, source }));
  return { host, tool, frame, shown, lang, stop, receive };
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
    srcLanguage: 'en-US',
    language: signal<HandoffLanguage>('en-US'),
    host: new EventTarget() as unknown as Window,
  });
  return { media, theme, tool };
}

describe('embeddedSrc (F-012.R5)', () => {
  test('adds the theme showing to the tool address, keeping its query and fragment', () => {
    expect(embeddedSrc(TOOL_URL, 'dark', 'en-US')).toBe('https://json.tarokit.app/?theme=dark&lang=en-US');
    expect(embeddedSrc('https://units.tarokit.app/app/?unit=m#top', 'light', 'en-US')).toBe(
      'https://units.tarokit.app/app/?unit=m&theme=light&lang=en-US#top',
    );
  });

  test('F019_AC11 with Vietnamese showing the address carries vi-VN and the theme showing', () => {
    expect(embeddedSrc(TOOL_URL, 'light', 'vi-VN')).toBe('https://json.tarokit.app/?theme=light&lang=vi-VN');
    // The portal's value wins over one already in the catalog address.
    expect(embeddedSrc('https://json.tarokit.app/?lang=en', 'dark', 'vi-VN')).toBe(
      'https://json.tarokit.app/?lang=vi-VN&theme=dark',
    );
  });

  test('refuses an insecure tool address (INV-02) and anything but light or dark', () => {
    expect(() => embeddedSrc('http://json.tarokit.app/', 'dark', 'en-US')).toThrow(/not a secure origin/);
    expect(() => embeddedSrc(TOOL_URL, 'system' as HandoffTheme, 'en-US')).toThrow(/invalid theme/);
    expect(() => embeddedSrc(TOOL_URL, 'dark', 'fr-FR' as HandoffLanguage)).toThrow(/invalid language/);
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
    expect(tool.sent).toEqual(readyAnswer('dark'));
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent.slice(-2)).toEqual(readyAnswer('light'));
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

  test('hand-off: ready then a change: the ready answer, then only the new theme', () => {
    const { tool, shown, receive } = setup('dark');
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    shown.value = 'light';
    expect(tool.sent).toEqual([...readyAnswer('dark'), themeSent('light')]);
  });

  test('hand-off: a change then ready: the change is posted once and ready is answered with the theme showing', () => {
    const { tool, shown, receive } = setup('dark');
    shown.value = 'light';
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual([themeSent('light'), ...readyAnswer('light')]);
    // Posted before ready, the change may have reached only the frame's blank page, so ready is always answered;
    // nothing else follows while the theme stays the same.
    shown.value = 'light';
    expect(tool.sent).toHaveLength(3);
  });

  test('hand-off: ready, then the same value again: no duplicate', () => {
    const { tool, shown, receive } = setup('light', 'dark');
    // Connecting sends the change made since the src was built.
    expect(tool.sent).toEqual([themeSent('light')]);
    tool.sent = [];
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    shown.value = 'light';
    shown.value = 'light';
    expect(tool.sent).toEqual(readyAnswer('light'));
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
        srcLanguage: 'en-US',
        language: signal<HandoffLanguage>('en-US'),
        host: new EventTarget() as unknown as Window,
      }),
    ).toThrow(/not a secure origin/);
  });

  test('stopping the hand-off removes the listener and the subscription', () => {
    const { tool, shown, lang, stop, receive } = setup('dark');
    stop();
    shown.value = 'light';
    lang.value = 'vi-VN';
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
      srcLanguage: 'en-US',
      language: signal<HandoffLanguage>('en-US'),
      host: new EventTarget() as unknown as Window,
    });
    expect(() => (shown.value = 'light')).not.toThrow();
  });
});

describe('language hand-off (F-019.R7)', () => {
  test('F019_AC12 a switch to English posts only the language, to the tool origin; nothing else is sent', () => {
    const { tool, lang } = setup('dark', 'dark', 'vi-VN');
    lang.value = 'en-US';
    expect(tool.sent).toEqual([langSent('en-US')]);
    expect(Object.keys(tool.sent[0]!.message as object)).toEqual(['type', 'value']);
    lang.value = 'en-US';
    expect(tool.sent).toHaveLength(1);
  });

  test('F019_AC13 a ready message from the tool frame and origin gets the language showing and the theme showing', () => {
    const { tool, receive } = setup('light', 'light', 'vi-VN');
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, tool);
    expect(tool.sent).toEqual(readyAnswer('light', 'vi-VN'));
  });

  test('F019_AC13 a ready message from any other address, or another window, gets nothing', () => {
    const { tool, receive } = setup('light', 'light', 'vi-VN');
    receive({ type: 'taro:ready' }, 'https://evil.example', tool);
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, new FakeFrameWindow());
    receive({ type: 'taro:ready' }, TOOL_ORIGIN, null);
    expect(tool.sent).toEqual([]);
  });

  test('F-019.R7 a language change between building the src and connecting is sent at once', () => {
    const { tool } = setup('dark', 'dark', 'vi-VN', 'en-US');
    expect(tool.sent).toEqual([langSent('vi-VN')]);
  });

  test('F-019.R7 theme and language are tracked apart: a theme toggle posts only the theme', () => {
    const { tool, shown, lang } = setup('dark', 'dark', 'vi-VN');
    shown.value = 'light';
    lang.value = 'en-US';
    expect(tool.sent).toEqual([themeSent('light'), langSent('en-US')]);
  });
});
