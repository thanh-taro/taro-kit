---
id: MOD-SecurityPolicy
title: Security policy and headers
status: draft
depends_on: [MOD-Content]
---

## Responsibility
MOD-SecurityPolicy turns the registry into the portal's security posture (ADR-0009).
- **Iframe attributes:** the permission-set-to-iframe mapping. It produces the `sandbox` tokens and the `allow` list for each tool.
- **CSP directives** handed to Astro's `security.csp`. These include `frame-src` set to the origins of visible embedded tools, plus `'self'`-only sources for everything else, which enforces NFR-05.
- **The `_headers` file:**
  - `frame-ancestors 'none'`;
  - a Permissions-Policy that delegates each feature only to the tool origins that declare it;
  - `Referrer-Policy`, `nosniff` and `COOP`;
  - cache rules: immutable for hashed assets, no-cache for HTML, `sw.js` and the manifest.
- **Build guard:** fails the build when an embedded tool shares the portal's origin.

## Not responsible for
- Creating frames (MOD-ToolHost).
- Validating content shape (MOD-Content).
- Checking tools' own `frame-ancestors` (MOD-CatalogCheck).

## Public surface
- `frameAttributesFor(tool) → { sandbox, allow, referrerpolicy }`.
- `cspDirectives(registry) → string[]`.
- `permissionsPolicy(registry) → string`.
- `writeHeaders(registry, distDir)`.

All are pure except the writer, and are unit-tested against RULE-10.

## Implements
F-003.R3 (with MOD-ToolHost). It is the main owner of NFR-08, and contributes to NFR-05.
