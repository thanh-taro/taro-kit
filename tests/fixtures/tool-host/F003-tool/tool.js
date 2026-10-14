// F-003 e2e fixture tool (blocking, in <head>).
const params = new URLSearchParams(location.search);
window.initialTheme = params.get('theme');
document.documentElement.dataset.theme = window.initialTheme ?? 'none';

// The portal is the embedding page's origin; its referrer policy (strict-origin) sends exactly that.
const portal = document.referrer ? new URL(document.referrer).origin : null;
window.received = [];
window.addEventListener('message', (event) => {
  if (event.origin !== portal) return;
  window.received.push(event.data);
  if (event.data && event.data.type === 'taro:theme') document.documentElement.dataset.theme = event.data.value;
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
};

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('stored').textContent = localStorage.getItem('fixture.value') ?? 'none';
  const result = document.getElementById('copy-result');
  document.getElementById('copy').addEventListener('click', () => {
    navigator.clipboard.writeText('written by the tool').then(
      () => (result.textContent = 'ok'),
      (e) => (result.textContent = e.name),
    );
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
