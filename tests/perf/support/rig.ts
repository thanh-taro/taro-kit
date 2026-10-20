// The Playwright performance rig for NFR-01 and NFR-02 (ADR-0006 and its SP-6 notes; reference-environment.md).
// - Mobile lab profile: 412 × 915 viewport, CDP 4× CPU slowdown, 9000/1500 Kbps and 170 ms RTT.
// - Each measure is the median of 5 runs, each in a fresh browser context.
// - The app emits no performance marks, so interaction latency is read from Event Timing (`event` entries, the
//   interaction's longest event, input to next paint), cross-checked by a frame probe (the event's timeStamp to a
//   task after the next animation frame). An interaction's latency is the later of the two; Event Timing does not
//   report events under its 16 ms threshold, which then read from the frame probe alone.
import type { Browser, BrowserContext, BrowserContextOptions, Page } from '@playwright/test';

export const RUNS = 5;

/** reference-environment.md, mobile lab profile. */
export const MOBILE: BrowserContextOptions = { viewport: { width: 412, height: 915 }, isMobile: true };
const CPU_SLOWDOWN = 4;
const NETWORK = {
  offline: false,
  latency: 170,
  downloadThroughput: (9000 * 1000) / 8,
  uploadThroughput: (1500 * 1000) / 8,
};

/** Applies the mobile profile's CPU and network throttling to a page, before it navigates. */
export async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
}

export async function newContext(browser: Browser, options: BrowserContextOptions = {}): Promise<BrowserContext> {
  return browser.newContext({ ...MOBILE, ...options });
}

export const median = (xs: number[]) => quantile(xs, 0.5);
/** Linear-interpolated quantile, q in [0, 1]. */
export function quantile(xs: number[], q: number): number {
  if (!xs.length) throw new Error('no samples');
  const s = [...xs].sort((a, b) => a - b);
  const at = (s.length - 1) * q;
  const lo = Math.floor(at);
  const hi = Math.ceil(at);
  return s[lo]! + (s[hi]! - s[lo]!) * (at - lo);
}
export const round = (x: number) => Math.round(x * 10) / 10;

// ---------- in-page probe (installed with addInitScript, so it runs before any page script) ----------

export interface Interaction {
  /** Input timeStamp to a task after the next animation frame. */
  frame: number;
  /** Longest Event Timing duration of the interaction's events, 0 when none crossed the 16 ms threshold. */
  eventTiming: number;
  /** The later of the two: the latency this rig gates on. */
  latency: number;
}

export interface FirstView {
  /** First contentful paint. */
  fcp: number;
  /** Largest contentful paint, as last reported. */
  lcp: number;
  /** The frame after the greeting text was in place, with the search control laid out. */
  rendered: number;
  /** When the palette bootstrap armed the search control (it marks the control with `aria-keyshortcuts`). */
  armed: number;
  /** The frame after the rig's first click on the armed control opened the palette (includes the rig's latency). */
  responded: number;
  /** NFR-01's usable moment: greeting and search rendered and responding to input, max(rendered, armed). */
  usable: number;
}

declare global {
  interface Window {
    __tkPerf: {
      fcp: number;
      lcp: number;
      rendered: number;
      armed: number;
      responded: number;
      /** Starts waiting for the next measured interaction (`kind`: the palette shortcut or a keystroke). */
      arm(kind: 'open' | 'key'): void;
      /** Resolves once the armed interaction's frame probe and Event Timing entries are in. */
      settle(): Promise<Interaction>;
    };
  }
}

/** The probe. Serialized into the page by addInitScript: it must not close over anything. */
export function probe(): void {
  const events: { name: string; start: number; duration: number }[] = [];
  const nextTask = (fn: () => void) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = fn;
    ch.port2.postMessage(0);
  };
  const afterPaint = (fn: () => void) => requestAnimationFrame(() => nextTask(fn));
  const state: Window['__tkPerf'] & { pending?: 'open' | 'key'; start?: number; frame?: Promise<number> } = {
    fcp: 0,
    lcp: 0,
    rendered: 0,
    armed: 0,
    responded: 0,
    arm(kind) {
      state.pending = kind;
      events.length = 0;
      state.start = undefined;
      state.frame = undefined;
    },
    async settle() {
      for (let i = 0; i < 200 && !state.frame; i++) await new Promise((r) => setTimeout(r, 5));
      if (!state.frame || state.start === undefined) throw new Error('the armed interaction never happened');
      const frame = await state.frame;
      const start = state.start;
      // Event Timing entries are queued after the paint that ends them; give them a few frames to arrive.
      await new Promise((r) => afterPaint(() => afterPaint(() => setTimeout(r, 50))));
      const eventTiming = Math.max(0, ...events.filter((e) => e.start >= start - 1).map((e) => e.duration));
      state.pending = undefined;
      return { frame, eventTiming, latency: Math.max(frame, eventTiming) };
    },
  };
  window.__tkPerf = state;

  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') state.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) state.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) events.push({ name: e.name, start: e.startTime, duration: e.duration });
  }).observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit);

  // Frame probe. The palette opens synchronously in the bootstrap's keydown handler, and results render in the
  // island's input handler (Preact flushes before the next frame), so the frame after the event shows the result.
  const measure = (e: Event) => {
    const start = e.timeStamp;
    state.start = start;
    state.frame = new Promise((resolve) => afterPaint(() => resolve(performance.now() - start)));
  };
  window.addEventListener(
    'keydown',
    (e) => {
      if (state.pending === 'open' && e.key.toLowerCase() === 'k' && state.frame === undefined) measure(e);
    },
    true,
  );
  // A keystroke's timeStamp is its keydown's; the frame is the one after the input event (after the island's
  // handler, since this listener is on window in the bubbling phase).
  let keyStart = 0;
  window.addEventListener('keydown', (e) => (keyStart = e.timeStamp), true);
  window.addEventListener('input', () => {
    if (state.pending !== 'key' || state.frame !== undefined) return;
    const start = keyStart;
    state.start = start;
    state.frame = new Promise((resolve) => afterPaint(() => resolve(performance.now() - start)));
  });

  // NFR-01 probe: the greeting text and the search control rendered; the bootstrap arming the control (its
  // listeners are added in the same synchronous script that sets the attribute); the palette opening.
  new MutationObserver((records, observer) => {
    if (records.some((r) => (r.target as Element).matches?.('[data-testid="home-search"]'))) {
      state.armed ||= performance.now();
      observer.disconnect();
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['aria-keyshortcuts'] });
  const watchFirstView = () => {
    const h1 = document.getElementById('home-greeting');
    const search = document.querySelector('[data-testid="home-search"]');
    if (!state.rendered && h1 && /^Good (morning|afternoon|evening)$/.test(h1.textContent ?? '') && search) {
      if (search.getBoundingClientRect().width > 0) afterPaint(() => (state.rendered ||= performance.now()));
    }
    const dialog = document.getElementById('tk-palette') as HTMLDialogElement | null;
    if (dialog?.open && !state.responded) {
      afterPaint(() => (state.responded ||= performance.now()));
      return;
    }
    requestAnimationFrame(watchFirstView);
  };
  requestAnimationFrame(watchFirstView);
}

/**
 * One NFR-01 first view of home: the usable moment is max(rendered, armed), as in SP-6 (max of LCP and bootstrap
 * armed), read in the page so the rig's own round trips do not count. A real click on the search control then
 * proves it responds (the palette opens); that click's frame is logged as `responded`, rig latency included.
 */
export async function firstView(page: Page, url: string): Promise<FirstView> {
  await page.addInitScript(probe);
  await throttle(page);
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__tkPerf.rendered > 0 && window.__tkPerf.armed > 0, null, {
    timeout: 10_000,
    polling: 'raf',
  });
  await page.getByTestId('home-search').click();
  await page.waitForFunction(() => window.__tkPerf.responded > 0, null, { timeout: 10_000 });
  await page.waitForLoadState('load');
  const v = await page.evaluate(() => {
    const p = window.__tkPerf;
    return { fcp: p.fcp, lcp: p.lcp, rendered: p.rendered, armed: p.armed, responded: p.responded };
  });
  return { ...v, usable: Math.max(v.rendered, v.armed) };
}
