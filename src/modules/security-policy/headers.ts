// MOD-SecurityPolicy: the response headers a meta CSP can't carry (ADR-0009), written to `_headers` (ADR-0007).
// - Permissions-Policy: each policy-controlled feature is delegated only to the visible embedded tools that
//   declare it, always with `self` first (SP-3: without it Chromium delegates nothing), and `()` otherwise, except
//   the portal's own features (PORTAL_FEATURES: clipboard-write for F-004.R5), which keep `(self)`.
// - frame-ancestors 'none', object-src and base-uri as a header policy; Referrer-Policy, nosniff, COOP, HSTS, and
//   Cache-Control: no-transform (the privacy guard from SP-3).
// - Cache rules (ADR-0007, F-011): pages, sw.js and the manifest are revalidated on every load (`no-cache`), so a
//   published version is found at once and the service worker decides what is offline; content-hashed files
//   (`/_astro/`, `/data/catalog.<hash>.json`) are immutable. Every rule keeps `no-transform`.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POLICY_FEATURE_FOR, POLICY_FEATURES, type Permission } from './frame.ts';
import { secureOrigin } from './origin.ts';

export interface PolicyTool {
  url: string;
  openMode: 'embedded' | 'linked';
  permissions: readonly string[];
  hidden?: boolean;
}

/**
 * Features the portal page itself uses, so `self` keeps them even when no tool declares them: clipboard-write for
 * the palette's copy-address action (F-004.R5). Frames still get a feature only through their own `allow`.
 */
export const PORTAL_FEATURES: ReadonlySet<string> = new Set(['clipboard-write']);

/**
 * `feature=(self "https://tool…")` per feature some visible embedded tool declares; otherwise `feature=(self)` for
 * the portal's own features (PORTAL_FEATURES) and `feature=()` for the rest.
 */
export function permissionsPolicy(tools: readonly PolicyTool[]): string {
  const embedded = tools.filter((t) => t.openMode === 'embedded' && !t.hidden);
  return POLICY_FEATURES.map((feature) => {
    const origins = [
      ...new Set(
        embedded
          .filter((t) => t.permissions.some((p) => POLICY_FEATURE_FOR[p as Permission] === feature))
          .map((t) => secureOrigin(t.url, 'Permissions-Policy')),
      ),
    ].sort();
    if (origins.length) return `${feature}=(self ${origins.map((o) => `"${o}"`).join(' ')})`;
    return PORTAL_FEATURES.has(feature) ? `${feature}=(self)` : `${feature}=()`;
  }).join(', ');
}

const REVALIDATE = 'no-cache, no-transform';
const IMMUTABLE = 'public, max-age=31536000, immutable, no-transform';

/** Headers for every response (ADR-0009, "Response headers"). */
export function securityHeaders(tools: readonly PolicyTool[]): [name: string, value: string][] {
  return [
    ['Content-Security-Policy', "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"],
    ['Permissions-Policy', permissionsPolicy(tools)],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['X-Content-Type-Options', 'nosniff'],
    ['Cross-Origin-Opener-Policy', 'same-origin'],
    // ADR-0009 (QA I-1): HTTPS only for a year. No includeSubDomains or preload: tools live on their own subdomains
    // and are separate projects (PRN-01), so the portal doesn't commit them.
    ['Strict-Transport-Security', 'max-age=31536000'],
    // ADR-0009 (SP-3 amendment): stops the host injecting analytics beacons into pages (NFR-05). The cache part
    // is the default rule of cacheRules().
    ['Cache-Control', REVALIDATE],
  ];
}

/** Cache-Control per path (ADR-0007): the `/*` default, then the paths that override it. */
export function cacheRules(): { path: string; cacheControl: string }[] {
  return [
    { path: '/*', cacheControl: REVALIDATE },
    { path: '/sw.js', cacheControl: REVALIDATE },
    { path: '/manifest.webmanifest', cacheControl: REVALIDATE },
    { path: '/_astro/*', cacheControl: IMMUTABLE },
    // Only the content-hashed catalog data file (MOD-Content); anything else under /data/ is revalidated.
    { path: '/data/catalog.*.json', cacheControl: IMMUTABLE },
  ];
}

/**
 * The `_headers` file (Cloudflare static assets format): the security headers for every path, then one block per
 * cache rule. Cloudflare applies every matching block, so each override detaches the default first
 * (`! Cache-Control`) and a path never gets two Cache-Control values.
 */
export function headersFile(tools: readonly PolicyTool[]): string {
  const overrides = cacheRules()
    .filter((r) => r.path !== '/*')
    .flatMap((r) => [r.path, '  ! Cache-Control', `  Cache-Control: ${r.cacheControl}`]);
  return ['/*', ...securityHeaders(tools).map(([n, v]) => `  ${n}: ${v}`), ...overrides, ''].join('\n');
}

/** Writes `<distDir>/_headers` after the build. */
export function writeHeaders(registry: { allTools: readonly PolicyTool[] }, distDir: string): void {
  writeFileSync(join(distDir, '_headers'), headersFile(registry.allTools));
}
