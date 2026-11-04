// F-003 e2e fixture tool (blocking, in <head>).
const params = new URLSearchParams(location.search);
window.initialTheme = params.get('theme');
document.documentElement.dataset.theme = window.initialTheme ?? 'none';
// F-019.R7: the language showing arrives the same way.
window.initialLang = params.get('lang');
document.documentElement.lang = window.initialLang ?? 'none';

// The portal is the embedding page's origin; its referrer policy (strict-origin) sends exactly that.
const portal = document.referrer ? new URL(document.referrer).origin : null;
window.received = [];
// F-003.AC14: the keys that reached the tool's document.
window.keys = [];
window.addEventListener('keydown', (event) => window.keys.push(event.key));
window.addEventListener('message', (event) => {
  if (event.origin !== portal) return;
  window.received.push(event.data);
  if (event.data && event.data.type === 'taro:theme') document.documentElement.dataset.theme = event.data.value;
  if (event.data && event.data.type === 'taro:language') document.documentElement.lang = event.data.value;
});

const attempt = (fn) => {
  try {
    const value = fn();
    return value === undefined ? 'undefined' : value;
  } catch (e) {
    return `${e.name}`;
  }
};

window.probe = {
  // F-003.AC4: everything a tool could try to reach the portal's personal data with.
  readPortal: () => ({
    parentStorage: attempt(() => window.parent.localStorage.getItem('tarokit.personal')),
    topStorage: attempt(() => window.top.localStorage.getItem('tarokit.personal')),
    parentDocument: attempt(() => window.parent.document.documentElement.outerHTML),
    ownStorage: attempt(() => localStorage.getItem('tarokit.personal')),
    ownKeys: attempt(() => Object.keys(localStorage).join(',')),
    cookies: attempt(() => document.cookie),
  }),
  // F-003.AC11: the tool's own local key-value storage.
  save: (value) => localStorage.setItem('fixture.value', value),
  read: () => localStorage.getItem('fixture.value'),
  // F-003.AC5: navigate the tool's own area elsewhere.
  navigateArea: (url) => {
    location.href = url;
  },
  // F-003.AC17: whether the share menu is available here, for a link with a title (canShare() with no data is false).
  canShare: () => attempt(() => (navigator.canShare ? navigator.canShare({ title: 'Fixture', url: location.href }) : 'unsupported')),
};

// The flag: on the ft-ready host the tool asks the portal for the theme once loaded (F-012.R6, ADR-0011).
if (location.hostname.startsWith('ft-ready.'))
  window.addEventListener('load', () => window.parent.postMessage({ type: 'taro:ready' }, portal));

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stored').textContent = localStorage.getItem('fixture.value') ?? 'none';
  const result = document.getElementById('copy-result');
  document.getElementById('copy').addEventListener('click', () => {
    navigator.clipboard.writeText('written by the tool').then(
      () => (result.textContent = 'ok'),
      (e) => (result.textContent = e.name),
    );
  });
  // F-003.AC13: save a file through a download link (refused without the downloads permission).
  document.getElementById('download').addEventListener('click', () => {
    const link = document.createElement('a');
    // A blob: link, as the tool contract asks (a data: link is refused by the portal's frame-src in WebKit).
    link.href = URL.createObjectURL(new Blob(['made by the tool'], { type: 'text/plain' }));
    link.download = 'fixture.txt';
    document.body.append(link);
    link.click();
    link.remove();
  });
  // F-003.AC12: unsaved work asks to be warned about before the page is left (shown only with dialogs).
  let dirty = false;
  document.getElementById('dirty').addEventListener('click', () => {
    dirty = true;
    document.getElementById('dirty-state').textContent = 'unsaved';
  });
  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
  // A user gesture inside the frame, trying to navigate the portal page itself (RULE-10).
  document.getElementById('top-nav').addEventListener('click', () => {
    try {
      window.top.location.href = 'https://elsewhere.test/from-top';
    } catch (e) {
      document.title = e.name;
    }
  });
});
