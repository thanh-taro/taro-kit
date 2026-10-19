// MOD-Offline signals (public surface): `online` and `updateReady`. Browser-safe; on the server (build) the portal
// is online with no update waiting, so islands render their quiet state.
// - online: navigator.onLine, kept current by the online and offline events (platform-mapping, F-011.R3).
// - updateReady: a new version is installed and waiting (F-011.R4); set by updates.ts, never cleared by itself.
import { signal } from '@preact/signals';

const hasWindow = typeof window !== 'undefined';

export const online = signal(hasWindow ? navigator.onLine : true);
export const updateReady = signal(false);

if (hasWindow) {
  const sync = () => (online.value = navigator.onLine);
  addEventListener('online', sync);
  addEventListener('offline', sync);
}
