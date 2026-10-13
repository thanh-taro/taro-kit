// ADR-0008 license policy and ADR-0009 CSP helpers.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { judge, spdxAlternatives } from '../../scripts/lib/licenses.ts';
import { parseRegistry } from '../../scripts/lib/registry.ts';
import { CSP_DIRECTIVES, frameSrcDirective } from '../../src/modules/security-policy/index.ts';

const rows = parseRegistry(readFileSync(join(import.meta.dirname, '../../specs/40-technical/dependencies.md'), 'utf8'));
const pkg = (name: string, license: string) => ({ name, versions: ['1.0.0'], license });

describe('ADR-0008 scope-based license check', () => {
  it('allows permissive licenses anywhere, including OR expressions', () => {
    expect(judge(pkg('anything', 'MIT'), rows).ok).toBe(true);
    expect(judge(pkg('wrangler', '(MIT OR Apache-2.0)'), rows).ok).toBe(true);
    expect(spdxAlternatives('(MIT OR Apache-2.0)')).toEqual([['MIT'], ['Apache-2.0']]);
  });

  it('allows MPL, LGPL and CC-BY only for registered build/dev packages', () => {
    expect(judge(pkg('lightningcss-darwin-arm64', 'MPL-2.0'), rows).ok).toBe(true);
    expect(judge(pkg('axe-core', 'MPL-2.0'), rows).ok).toBe(true);
    expect(judge(pkg('@img/sharp-libvips-linux-x64', 'LGPL-3.0-or-later'), rows).ok).toBe(true);
    expect(judge(pkg('caniuse-lite', 'CC-BY-4.0'), rows).ok).toBe(true);
    expect(judge(pkg('unregistered-lib', 'MPL-2.0'), rows)).toMatchObject({ ok: false });
  });

  it('rejects build-only licenses on runtime packages, and copyleft or unknown licenses anywhere', () => {
    expect(judge(pkg('preact', 'MPL-2.0'), rows)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/runtime scope/),
    });
    expect(judge(pkg('some-gpl', 'GPL-3.0'), rows).ok).toBe(false);
    expect(judge(pkg('mystery', 'UNKNOWN'), rows).ok).toBe(false);
  });
});

describe('ADR-0009 CSP', () => {
  it('pages without an embedded tool send frame-src none', () => {
    expect(frameSrcDirective()).toBe("frame-src 'none'");
  });

  it('a tool page allows only its own tool origin', () => {
    expect(frameSrcDirective('https://json.tarokit.app/some/path?x=1')).toBe('frame-src https://json.tarokit.app');
    expect(() => frameSrcDirective('http://json.tarokit.app/')).toThrow(/not a secure origin/);
  });

  it('the base policy is self-only with no global frame-src', () => {
    expect(CSP_DIRECTIVES).toContain("default-src 'self'");
    expect(CSP_DIRECTIVES).toContain("object-src 'none'");
    expect(CSP_DIRECTIVES.some((d) => d.startsWith('frame-src'))).toBe(false);
  });
});
