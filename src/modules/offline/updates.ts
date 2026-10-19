// MOD-Offline: service worker registration and the prompt update model (ADR-0004, workbox-window DEP-13).
// - A new version waits. Its `waiting` event (also fired at registration when one was already waiting from an
//   earlier visit) sets `updateReady`, and the shell shows the update message (F-011.R4).
// - Only activateUpdate() (the user's refresh) sends SKIP_WAITING; the page then reloads once, when the new worker
//   takes control. Nothing else ever reloads the page.
// - Update checks: at registration and on every navigation (the browser), when the page becomes visible again,
//   and hourly while open.
// The worker serves the portal's own origin only (src/sw/sw.ts); personal data in localStorage is never touched.
import { Workbox } from 'workbox-window';
import { updateReady } from './state.ts';

const HOURLY = 60 * 60 * 1000;
let wb: Workbox | undefined;

/** Registers /sw.js once per page. Unsupported browsers (or a failed registration) keep a plain website. */
export function registerServiceWorker(scriptUrl = '/sw.js'): void {
  if (wb || !('serviceWorker' in navigator)) return;
  wb = new Workbox(scriptUrl);
  const workbox = wb;
  workbox.addEventListener('waiting', () => (updateReady.value = true));
  workbox
    .register()
    .then((registration) => {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void workbox.update().catch(() => {});
      });
      setInterval(() => void workbox.update().catch(() => {}), HOURLY);
    })
    .catch(() => {
      // No worker (for example a build without sw.js): the portal still works as a website (F-011 edge case).
    });
}

/**
 * The user's refresh: activate the waiting version, then reload exactly once when it controls the page. When another
 * window of the portal already activated it, nothing is waiting any more and the page reloads into it at once.
 */
export async function activateUpdate(): Promise<void> {
  if (!wb || !updateReady.value) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.waiting) return location.reload();
  let reloaded = false;
  wb.addEventListener('controlling', () => {
    if (reloaded) return;
    reloaded = true;
    location.reload();
  });
  wb.messageSkipWaiting();
}
