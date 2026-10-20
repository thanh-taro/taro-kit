// Cross-origin test sites for the tool view (F-003, F-012.R5/R6), routed by Playwright in the browser context.
// - https://tarokit.test: the portal. Every request is proxied to the fixture build (FX in ports.ts, dist-fixtures/)
//   and gets the build's `_headers` (ADR-0009: Permissions-Policy, COOP, frame-ancestors), as the host would.
// - https://elsewhere-portal.test: the same build under an unrelated site (the AC11 storage-partition control).
// - https://<id>.tarokit.test: the fixture tool (tests/fixtures/tool-host/F003-tool), one per catalog entry,
//   same-site with the portal but on its own origin, as ADR-0001 lays tools out.
// - https://elsewhere.test and https://fx-linked.example.com: other sites; requests are only recorded.
// Every address is https, as INV-02 requires of catalog addresses, so real secure contexts and origins apply.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserContext, Route } from '@playwright/test';
import { FX } from '../ports.ts';

const root = join(import.meta.dirname, '../../..');
/** The fixture build's preview server (ports.ts, env-overridable). */
export const BUILD = FX;
export const PORTAL = 'https://tarokit.test';
export const OTHER_PORTAL = 'https://elsewhere-portal.test';
export const toolUrl = (id: string) => `https://${id}.tarokit.test/`;
export const toolPage = (id: string, portal = PORTAL) => `${portal}/t/${id}/`;

const fixture = (name: string) => readFileSync(join(root, 'tests/fixtures/tool-host/F003-tool', name), 'utf8');

/** The `/*` rule of dist-fixtures/_headers (MOD-SecurityPolicy writes it after the build). */
function buildHeaders(): Record<string, string> {
  const file = join(root, 'dist-fixtures/_headers');
  if (!existsSync(file)) throw new Error('dist-fixtures/_headers missing: the fixture build did not write it');
  const headers: Record<string, string> = {};
  let inAll = false;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith(' ')) inAll = line.trim() === '/*';
    else if (inAll) {
      const at = line.indexOf(':');
      headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
    }
  }
  return headers;
}

export interface Sites {
  /** Every request made to a tool origin, in order. */
  toolRequests: string[];
  /** Every request made to another site (elsewhere.test, linked tools). */
  otherRequests: string[];
  /** The `_headers` applied to portal responses. */
  headers: Record<string, string>;
  /** Holds the next tool responses until `release()` (a slow tool, F-003.AC8). */
  holdTools(): { release(): void };
}

export async function serveSites(context: BrowserContext): Promise<Sites> {
  const headers = buildHeaders();
  const toolRequests: string[] = [];
  const otherRequests: string[] = [];
  let hold: Promise<void> | null = null;

  const portal = async (route: Route) => {
    const url = new URL(route.request().url());
    try {
      // Firefox forwards the page's Host (tarokit.test), which the preview server refuses ("Blocked request"),
      // so the proxied request drops it and gets the preview server's own host.
      const { host: _host, ...forwarded } = route.request().headers();
      const response = await route.fetch({ url: `${BUILD}${url.pathname}${url.search}`, headers: forwarded });
      await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
    } catch (e) {
      // A request the page abandoned mid-flight (it navigated away, e.g. a preload or the worker's precache):
      // nothing is left to answer. Any other failure still fails the test.
      if (/disposed|closed|Request context/i.test(String(e))) return;
      throw e;
    }
  };
  await context.route(/^https:\/\/(tarokit|elsewhere-portal)\.test\//, portal);

  await context.route(/^https:\/\/[a-z0-9-]+\.tarokit\.test\//, async (route) => {
    const url = new URL(route.request().url());
    toolRequests.push(url.href);
    if (hold) await hold;
    if (url.pathname === '/tool.js') return route.fulfill({ body: fixture('tool.js'), contentType: 'text/javascript' });
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 404 });
    return route.fulfill({ body: fixture('tool.html'), contentType: 'text/html' });
  });

  await context.route(/^https:\/\/(elsewhere\.test|fx-linked\.example\.com)\//, (route) => {
    otherRequests.push(route.request().url());
    return route.fulfill({
      body: '<!doctype html><html lang="en"><title>Elsewhere</title><h1>Another site</h1></html>',
      contentType: 'text/html',
    });
  });

  return {
    toolRequests,
    otherRequests,
    headers,
    holdTools() {
      let release!: () => void;
      hold = new Promise<void>((resolve) => (release = resolve));
      return {
        release: () => {
          hold = null;
          release();
        },
      };
    },
  };
}
