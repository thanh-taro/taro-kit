// Portal stand-in: embeds the tool with the real MOD-ToolHost helpers (transpiled from
// src/modules/tool-host/theme-handoff.ts and served as /theme-handoff.js).
// Query: ?pref=light|dark|system (theme preference), &tool=<tool URL in the catalog>.
import { connectThemeHandoff, embeddedSrc } from '/theme-handoff.js';

const params = new URLSearchParams(location.search);
const pref = params.get('pref') ?? 'dark';
const toolUrl = params.get('tool') ?? 'https://tool.test/tool.html';

// A minimal stand-in for MOD-Theme's shownTheme signal: an explicit choice, or the device setting.
const media = matchMedia('(prefers-color-scheme: light)');
let chosen = pref === 'system' ? null : pref;
const listeners = new Set();
const current = () => chosen ?? (media.matches ? 'light' : 'dark');
let shown = current();
const update = () => {
  if (current() === shown) return;
  shown = current();
  document.documentElement.dataset.theme = shown;
  listeners.forEach((fn) => fn(shown));
};
media.addEventListener('change', update);
const theme = {
  get value() {
    return shown;
  },
  subscribe(fn) {
    listeners.add(fn);
    fn(shown);
    return () => listeners.delete(fn);
  },
};
document.documentElement.dataset.theme = shown;

// The header toggle (RULE-03): the opposite of the theme showing.
window.toggleTheme = () => {
  chosen = shown === 'dark' ? 'light' : 'dark';
  update();
};

const frame = document.createElement('iframe');
frame.title = 'Test tool';
const srcTheme = theme.value;
frame.src = embeddedSrc(toolUrl, srcTheme);
document.body.append(frame);
connectThemeHandoff({ frame, toolUrl, srcTheme, theme, host: window });

// A second frame from the same origin as the tool: not this tool's frame, so it must get no answer.
if (params.has('impostor')) {
  const impostor = document.createElement('iframe');
  impostor.title = 'Impostor';
  impostor.src = 'https://tool.test/impostor.html';
  document.body.append(impostor);
}
