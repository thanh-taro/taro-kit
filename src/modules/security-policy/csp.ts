// MOD-SecurityPolicy: the Content-Security-Policy handed to Astro's `security.csp` (ADR-0009, NFR-05, NFR-08).
// Astro adds `script-src` and `style-src` with 'self' plus per-page hashes.
// `frame-src` is deliberately absent here: each page sets exactly one (frameSrcDirective), because Astro
// merges a page's directive into a global one, and "'none' <origin>" is not a valid source list.

import { secureOrigin } from './origin.ts';

export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
] as const;

/**
 * The page's `frame-src`: the one origin of the tool embedded on that page (`/t/<id>/` only),
 * otherwise 'none' (ADR-0009, amendment from SP-4).
 */
export function frameSrcDirective(embeddedToolUrl?: string): `frame-src ${string}` {
  if (!embeddedToolUrl) return "frame-src 'none'";
  return `frame-src ${secureOrigin(embeddedToolUrl, 'frame-src')}`;
}
