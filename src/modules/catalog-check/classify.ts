// MOD-CatalogCheck: decides whether an embedded tool's final response lets the portal embed it.
// Implements: F-014.R2, RULE-12 (embeddable = no restriction, or the portal's origin is explicitly allowed).
// Ported from spike SP-2 (spikes/sp2/classify.mjs), which agreed with Chromium and WebKit on 22/22 fixtures.
// References: CSP3 §6.7 (frame-ancestors) and the HTML "X-Frame-Options" processing model.

/** A fetch `Headers`, or a plain object whose array values are repeated header lines. */
export type HeaderSource = Headers | Record<string, string | string[] | undefined>;

export type EmbedReason =
  | 'no-restriction'
  | 'csp-frame-ancestors-admits-portal'
  | 'csp-frame-ancestors-excludes-portal'
  | 'xfo-deny'
  | 'xfo-sameorigin-cross-origin'
  | 'xfo-sameorigin-same-origin'
  | 'xfo-conflicting-values'
  | 'xfo-allowall'
  | 'xfo-invalid-ignored';

export interface EmbedVerdict {
  embeddable: boolean;
  reason: EmbedReason;
  /** Human-readable detail for the report (the offending policy or header value). */
  detail?: string;
  /** Non-blocking findings, such as an unrecognized X-Frame-Options value. */
  warnings: string[];
}

const DEFAULT_PORT: Readonly<Record<string, string>> = { 'http:': '80', 'https:': '443', 'ws:': '80', 'wss:': '443' };

/** A header's value; repeated lines are joined with ", " the way fetch joins them. */
export function readHeader(headers: HeaderSource | undefined, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name);
  for (const [k, v] of Object.entries(headers as Record<string, string | string[] | undefined>)) {
    if (k.toLowerCase() === name && v !== undefined) return Array.isArray(v) ? v.join(', ') : v;
  }
  return null;
}

/** Splits a (possibly comma-joined) CSP header into policies: first-seen directive -> source list. */
export function parseCsp(value: string | null): Map<string, string[]>[] {
  if (!value) return [];
  return value.split(',').map((policy) => {
    const directives = new Map<string, string[]>();
    for (const raw of policy.split(';')) {
      const tokens = raw
        .trim()
        .split(/[\t\n\f\r ]+/)
        .filter(Boolean);
      if (!tokens.length) continue;
      const name = tokens[0].toLowerCase();
      if (!directives.has(name)) directives.set(name, tokens.slice(1)); // the first duplicate wins (CSP3)
    }
    return directives;
  });
}

const schemeMatches = (expr: string, url: string): boolean =>
  expr === url ||
  (expr === 'http:' && url === 'https:') ||
  (expr === 'ws:' && ['wss:', 'http:', 'https:'].includes(url)) ||
  (expr === 'wss:' && url === 'https:');

function portMatches(exprPort: string, url: URL): boolean {
  const urlPort = url.port || DEFAULT_PORT[url.protocol] || '';
  if (exprPort === '*') return true;
  if (exprPort === '') return urlPort === (DEFAULT_PORT[url.protocol] ?? ''); // no port = the default port
  if (exprPort === urlPort) return true;
  return exprPort === '80' && urlPort === '443'; // upgrade
}

function hostMatches(exprHost: string, urlHost: string): boolean {
  const e = exprHost.toLowerCase();
  const u = urlHost.toLowerCase();
  if (e.startsWith('*.')) return u.endsWith(e.slice(1)); // subdomains only, never the apex
  return e === u;
}

/** Does one source expression admit `ancestor`? `self` is the tool's own (final) URL. */
export function sourceMatches(expr: string, ancestor: URL, self: URL): boolean {
  const e = expr.toLowerCase();
  if (e === '*') return ['http:', 'https:'].includes(ancestor.protocol) || ancestor.protocol === self.protocol;
  if (e === "'self'") {
    if (ancestor.origin === self.origin) return true;
    // CSP3 upgrade: an http self also admits the https origin of the same host on the default port.
    return (
      self.protocol === 'http:' &&
      ancestor.protocol === 'https:' &&
      ancestor.hostname === self.hostname &&
      !self.port &&
      !ancestor.port
    );
  }
  if (e.startsWith("'")) return false; // other keywords, nonces and hashes never match an ancestor
  const schemeOnly = /^([a-z][a-z0-9+.-]*:)$/.exec(e);
  if (schemeOnly) return schemeMatches(schemeOnly[1], ancestor.protocol);
  const m = /^(?:([a-z][a-z0-9+.-]*:)\/\/)?(\*|(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*)(?::(\d+|\*))?(\/.*)?$/.exec(e);
  if (!m) return false;
  const [, scheme, host, port = ''] = m; // the path part is ignored: ancestors are matched as origins
  if (!schemeMatches(scheme ?? self.protocol, ancestor.protocol)) return false;
  if (host !== '*' && !hostMatches(host, ancestor.hostname)) return false;
  return portMatches(port, ancestor);
}

function sourceListAdmits(list: string[], ancestor: URL, self: URL): boolean {
  if (list.length === 0) return false;
  if (list.length === 1 && list[0].toLowerCase() === "'none'") return false; // 'none' counts only when alone
  return list.some((expr) => sourceMatches(expr, ancestor, self));
}

/**
 * Pure classifier (MOD-CatalogCheck public surface). `headers` are the final response's headers;
 * `toolOrigin` is the final response URL's origin, needed to resolve 'self'.
 * Content-Security-Policy-Report-Only is never read.
 */
export function classifyEmbedding(headers: HeaderSource, portalOrigin: string, toolOrigin: string): EmbedVerdict {
  const ancestor = new URL(portalOrigin);
  const self = new URL(toolOrigin);
  const warnings: string[] = [];
  const withFa = parseCsp(readHeader(headers, 'content-security-policy')).filter((p) => p.has('frame-ancestors'));
  const xfoRaw = readHeader(headers, 'x-frame-options');

  if (withFa.length) {
    // Every enforced policy must admit the portal; frame-ancestors overrides X-Frame-Options.
    for (const [i, p] of withFa.entries()) {
      const list = p.get('frame-ancestors') ?? [];
      if (!sourceListAdmits(list, ancestor, self)) {
        const which = withFa.length > 1 ? ` (policy ${i + 1} of ${withFa.length})` : '';
        return {
          embeddable: false,
          reason: 'csp-frame-ancestors-excludes-portal',
          detail: `frame-ancestors "${list.join(' ')}"${which} does not allow ${ancestor.origin}`,
          warnings,
        };
      }
    }
    return { embeddable: true, reason: 'csp-frame-ancestors-admits-portal', warnings };
  }

  if (xfoRaw == null) return { embeddable: true, reason: 'no-restriction', warnings };
  const values = new Set(
    xfoRaw
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );
  if (values.size > 1) {
    if (['deny', 'sameorigin', 'allowall'].some((v) => values.has(v))) {
      return {
        embeddable: false,
        reason: 'xfo-conflicting-values',
        detail: `X-Frame-Options "${xfoRaw}" has conflicting values`,
        warnings,
      };
    }
    warnings.push(`X-Frame-Options "${xfoRaw}" is not a recognized value and is ignored`);
    return { embeddable: true, reason: 'xfo-invalid-ignored', warnings };
  }
  const [v] = values;
  if (v === 'deny') return { embeddable: false, reason: 'xfo-deny', detail: 'X-Frame-Options DENY', warnings };
  if (v === 'sameorigin') {
    return ancestor.origin === self.origin
      ? { embeddable: true, reason: 'xfo-sameorigin-same-origin', warnings }
      : {
          embeddable: false,
          reason: 'xfo-sameorigin-cross-origin',
          detail: `X-Frame-Options SAMEORIGIN allows only ${self.origin}, not ${ancestor.origin}`,
          warnings,
        };
  }
  if (v === 'allowall') return { embeddable: true, reason: 'xfo-allowall', warnings };
  warnings.push(`X-Frame-Options "${xfoRaw}" is not a recognized value and is ignored`);
  return { embeddable: true, reason: 'xfo-invalid-ignored', warnings };
}
