// Inline scripts must be allowed by hash (ADR-0009). Astro's CSP does not hash `is:inline` scripts, and
// hashes added after <head> has rendered are dropped, so layouts register them in their frontmatter
// (ADR-0002 amendment from SP-6).
import { createHash } from 'node:crypto';

export const inlineScriptHash = (code: string): `sha256-${string}` =>
  `sha256-${createHash('sha256').update(code).digest('base64')}`;
