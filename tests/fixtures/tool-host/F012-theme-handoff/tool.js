// Test tool script (blocking, in <head>): applies ?theme= before first paint and records what the portal sends.
const params = new URLSearchParams(location.search);
window.initialTheme = params.get('theme');
document.documentElement.dataset.theme = window.initialTheme ?? 'none';
window.received = [];
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://portal.test') return;
  window.received.push(event.data);
  if (event.data && event.data.type === 'taro:theme') document.documentElement.dataset.theme = event.data.value;
});
window.addEventListener('load', () => {
  if (params.get('mode') === 'ready') parent.postMessage({ type: 'taro:ready' }, 'https://portal.test');
  if (params.has('nested')) {
    const foreign = document.createElement('iframe');
    foreign.src = 'https://other.test/foreign.html';
    document.body.append(foreign);
  }
});
