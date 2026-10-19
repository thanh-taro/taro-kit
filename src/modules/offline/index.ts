// MOD-Offline public surface (browser): the `online` and `updateReady` signals, activateUpdate(), and
// connectOffline(), which MOD-Shell calls once per page. The manifest (manifest.ts) and the post-build precache
// step (precache.ts, `pnpm sw:build`) are separate entry points, so no Node code reaches the browser.
// Implements: F-011.R1, F-011.R2 and F-011.R4 (mechanism); main owner of NFR-06.
import { registerServiceWorker } from './updates.ts';

export { online, updateReady } from './state.ts';
export { activateUpdate } from './updates.ts';

/** Starts the offline worker and its update checks for this page. */
export function connectOffline(): void {
  registerServiceWorker();
}
