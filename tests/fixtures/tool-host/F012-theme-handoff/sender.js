// Posts taro:ready to the top window (the portal) once loaded, then records that it did.
window.addEventListener('load', () => {
  top.postMessage({ type: 'taro:ready' }, '*');
  document.title = 'sent';
});
