/// <reference lib="webworker" />
// MOD-Offline service worker (ADR-0004 with the SP-4 amendments). Bundled and given its precache list after the
// build by `pnpm sw:build` (src/modules/offline/precache.ts).
// - Precache: every page and asset of the portal, installed with several requests in flight (Workbox installs one
//   at a time, workbox#2528; SP-4).
// - Pages: a precached page answers its clean URL (`/t/json/` → t/json/index.html), so after one online visit every
//   page works offline (F-011.R2, NFR-06). Any other same-origin page goes to the network; offline, the precached
//   404.html answers with status 404 (F-011.AC4).
// - Only the portal's own origin is handled. Requests to other origins (embedded and linked tools, anything
//   cross-origin) match no route, so the worker never answers them and the browser handles them as usual.
// - Prompt updates: a new worker waits until the user's refresh sends SKIP_WAITING (F-011.R4).
// - It reads and writes only its own caches, never the portal's personal data (localStorage, ADR-0010).
import { cleanupOutdatedCaches, PrecacheController, PrecacheRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};
/** Requests in flight during install (precache.ts PRECACHE_CONCURRENCY). */
declare const __PRECACHE_CONCURRENCY__: number;

const sameOrigin = (url: URL) => url.origin === self.location.origin;

const precache = new PrecacheController();
precache.addToCacheList(self.__WB_MANIFEST);

self.addEventListener('install', (event) => {
  // PrecacheController.install, with N requests in flight over the same strategy and cache keys (SP-4).
  const queue = [...precache.getURLsToCacheKeys()];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      const [url, cacheKey] = item;
      const request = new Request(url, { credentials: 'same-origin' });
      await Promise.all(precache.strategy.handleAll({ event, request, params: { cacheKey } }));
    }
  };
  event.waitUntil(Promise.all(Array.from({ length: __PRECACHE_CONCURRENCY__ }, worker)));
});
// activate() extends the event itself, and removes entries a previous version had but this one does not.
self.addEventListener('activate', (event) => void precache.activate(event));
cleanupOutdatedCaches();

// Precached files, pages by clean URL (directoryIndex index.html). Query strings don't select another page.
registerRoute(new PrecacheRoute(precache, { ignoreURLParametersMatching: [/.*/] }));

// Other same-origin pages: the network (online, the host's own 404 answers), then the precached 404.html.
// A route is needed: the catch handler runs only for requests some route handled (SP-4).
registerRoute(({ request, url }) => request.mode === 'navigate' && sameOrigin(url), new NetworkOnly());
setCatchHandler(async ({ request }) => {
  if (request.mode === 'navigate') {
    const page = await precache.matchPrecache('/404.html');
    if (page) return new Response(page.body, { status: 404, statusText: 'Not Found', headers: page.headers });
  }
  return Response.error();
});

self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});
