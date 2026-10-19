// MOD-CatalogCheck: is an address reachable?
// Implements: RULE-12 (success after at most 5 redirects, 10 s per attempt, one retry only after a timeout,
// network error or server error, never after a 4xx), F-014.R1, F-014.R4.

export interface ReachOptions {
  maxRedirects?: number;
  /** Limit for one attempt, covering every redirect hop of that attempt. */
  timeoutMs?: number;
  retries?: number;
  userAgent?: string;
}

export type ReachReason = 'ok' | 'timeout' | 'network-error' | 'too-many-redirects' | 'status';

export interface ReachResult {
  ok: boolean;
  reason: ReachReason;
  /** HTTP status of the last response, when one arrived. */
  status?: number;
  /** The URL that gave the final response (after redirects). */
  finalUrl: string;
  attempts: number;
  /** Final response headers, when one arrived (used by the embedding check). */
  headers?: Headers;
  /** Low-level cause for network errors, e.g. ECONNREFUSED. */
  error?: string;
}

export const REACH_DEFAULTS = {
  maxRedirects: 5,
  timeoutMs: 10_000,
  retries: 1,
  userAgent: 'TaroKit-CatalogCheck/1.0 (+https://tarokit.app)',
} as const satisfies Required<ReachOptions>;

/** Retry only after a timeout, a network error or a server error (RULE-12). */
const retryable = (r: ReachResult): boolean =>
  r.reason === 'timeout' || r.reason === 'network-error' || (r.reason === 'status' && (r.status ?? 0) >= 500);

export async function checkReachability(address: string, options: ReachOptions = {}): Promise<ReachResult> {
  const opts = { ...REACH_DEFAULTS, ...options };
  let last: ReachResult | undefined;
  for (let attempt = 1; attempt <= opts.retries + 1; attempt++) {
    last = { ...(await attemptOnce(address, opts)), attempts: attempt };
    if (last.ok || !retryable(last)) return last;
  }
  return last!;
}

async function attemptOnce(address: string, opts: Required<ReachOptions>): Promise<Omit<ReachResult, 'attempts'>> {
  const signal = AbortSignal.timeout(opts.timeoutMs);
  let url = address;
  try {
    for (let hops = 0; ; hops++) {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal,
        headers: { 'user-agent': opts.userAgent },
      });
      await res.body?.cancel().catch(() => {}); // headers are all the check needs
      const location = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && location) {
        if (hops >= opts.maxRedirects)
          return { ok: false, reason: 'too-many-redirects', status: res.status, finalUrl: url };
        url = new URL(location, url).href;
        continue;
      }
      return { ok: res.ok, reason: res.ok ? 'ok' : 'status', status: res.status, finalUrl: url, headers: res.headers };
    }
  } catch (err) {
    const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
    if (e?.name === 'TimeoutError' || signal.aborted) return { ok: false, reason: 'timeout', finalUrl: url };
    return {
      ok: false,
      reason: 'network-error',
      finalUrl: url,
      error: e?.cause?.code ?? e?.cause?.message ?? e?.message,
    };
  }
}
