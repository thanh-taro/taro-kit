// Code generation (ADR-0003, ADR-0005, MOD-Copy, ADR-0008): tokens, copy, domain types, notices.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkThemesMatch, flattenTokens, renderTokensCss, renderTokensTs } from '../../scripts/lib/tokens.ts';
import { parseCopy, renderCopyModule } from '../../scripts/lib/copy.ts';
import { renderDomainTypes } from '../../scripts/lib/domain-types.ts';
import { packageNames, parseRegistry } from '../../scripts/lib/registry.ts';
import { renderNotices } from '../../scripts/lib/notices.ts';
import { t, tBoth } from '../../src/modules/copy/index.ts';

const root = join(import.meta.dirname, '../..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const tokensJson = () => JSON.parse(read('specs/30-experience/tokens.json'));

describe('tokens.json -> tokens.css', () => {
  it('puts the dark theme on :root and the light theme under [data-theme="light"]', async () => {
    const css = renderTokensCss(await flattenTokens(tokensJson()));
    const root = css.slice(css.indexOf(':root {'), css.indexOf("[data-theme='light']"));
    const light = css.slice(css.indexOf("[data-theme='light']"), css.indexOf('@media'));
    expect(root).toContain('--tk-color-bg: #0F0B16;');
    expect(root).toContain('color-scheme: dark;');
    expect(light).toContain('--tk-color-bg: #FBFAFE;');
    expect(light).toContain('color-scheme: light;');
    expect(light).not.toContain('--tk-space-');
  });

  it('names variables --tk-<group>-<name> with no theme segment, and leaves out the contrast list', async () => {
    const flat = await flattenTokens(tokensJson());
    const names = flat.map((f) => f.cssVar);
    expect(names).toContain('--tk-color-on-accent');
    expect(names).toContain('--tk-space-4');
    expect(names).toContain('--tk-radius-md');
    expect(names).toContain('--tk-font-family-body');
    expect(names).toContain('--tk-shadow-glow');
    expect(names.some((n) => /-(dark|light)(-|$)/.test(n))).toBe(false);
    expect(names.some((n) => n.includes('contrast'))).toBe(false);
  });

  it('renders composite values as CSS', async () => {
    const css = renderTokensCss(await flattenTokens(tokensJson()));
    expect(css).toContain('--tk-motion-easing-standard: cubic-bezier(0.2, 0.8, 0.2, 1);');
    expect(css).toContain('--tk-shadow-glow: 0px 30px 80px -30px #7846FF73;');
    expect(css).toContain("--tk-font-family-mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;");
  });

  it('NFR-07 emits type sizes in rem (px / 16), so they follow the browser text size; tokens.ts keeps px', async () => {
    const flat = await flattenTokens(tokensJson());
    const css = renderTokensCss(flat);
    // Same rendered size at the default 16 px root (QA a11y m6).
    expect(css).toContain('--tk-font-size-base: 0.9375rem;');
    expect(css).toContain('--tk-font-size-xs: 0.75rem;');
    expect(css).toContain('--tk-font-size-6xl: 4.5rem;');
    expect(css).not.toMatch(/--tk-font-size-[\w-]+: [\d.]+px;/);
    // Everything else (spacing, radii, touch targets) stays in px.
    expect(css).toContain('--tk-space-4: 16px;');
    expect(css).toContain('--tk-size-touch-target: 44px;');
    expect(renderTokensTs(flat)).toContain('"font-size-base": "15px"');
  });

  it('fails when the two themes define different roles', () => {
    expect(() => checkThemesMatch([{ cssVar: '--tk-color-bg', value: '#000', theme: 'dark' }], [])).toThrow(
      /--tk-color-bg \(light\)/,
    );
  });

  it('emits a typed token map', async () => {
    const ts = renderTokensTs(await flattenTokens(tokensJson()));
    expect(ts).toContain('"color-bg": "#0F0B16"');
    expect(ts).toContain('export const cssVar');
  });
});

describe('copy.md -> message catalog (MOD-Copy, F-019: en-US and vi-VN columns)', () => {
  const md = [
    '| ID | en-US | vi-VN | Notes |',
    '|---|---|---|---|',
    '| **COPY-a.plain** | Hello | Xin chào | note |',
    '| **COPY-a.params** | Hi {name}, you have {count} tools, {name}. | Chào {name}, bạn có {count} công cụ. | note |',
    '| **COPY-a.pipe** | One \\| two | Một \\| hai | escaped pipe |',
  ].join('\n');

  it('parses every COPY row with both versions and its placeholders', () => {
    expect(parseCopy(md)).toEqual([
      { id: 'COPY-a.plain', text: { 'en-US': 'Hello', 'vi-VN': 'Xin chào' }, params: [] },
      {
        id: 'COPY-a.params',
        text: {
          'en-US': 'Hi {name}, you have {count} tools, {name}.',
          'vi-VN': 'Chào {name}, bạn có {count} công cụ.',
        },
        params: ['name', 'count'],
      },
      { id: 'COPY-a.pipe', text: { 'en-US': 'One | two', 'vi-VN': 'Một | hai' }, params: [] },
    ]);
  });

  it('types the placeholders of each id', () => {
    const ts = renderCopyModule(parseCopy(md));
    expect(ts).toContain('"COPY-a.params": { name: string | number; count: string | number };');
    expect(ts).not.toMatch(/"COPY-a\.plain": \{ [a-z]/);
  });

  it('rejects a duplicated id', () => {
    expect(() => parseCopy(`${md}\n| **COPY-a.plain** | Again | Lần nữa | x |`)).toThrow(/defined twice/);
  });

  it('F-019 generation fails on a missing version, naming the id and the language', () => {
    expect(() => parseCopy(`${md}\n| **COPY-a.half** | Only English |  | x |`)).toThrow(/COPY-a\.half.*vi-VN/);
    expect(() => parseCopy(`${md}\n| **COPY-a.none** |  | Chỉ tiếng Việt | x |`)).toThrow(/COPY-a\.none.*en-US/);
  });

  it('F-019 generation fails when the two versions have different placeholders', () => {
    expect(() => parseCopy(`${md}\n| **COPY-a.odd** | Hi {name} | Chào bạn | x |`)).toThrow(/COPY-a\.odd.*\{name\}/);
  });

  it('reads the real copy.md, and t(id, params?, lang?) fills placeholders in the language asked for', () => {
    const ids = parseCopy(read('specs/30-experience/copy.md')).map((e) => e.id);
    expect(ids).toContain('COPY-shell.skip');
    expect(t('COPY-shell.skip')).toBe('Skip to content');
    expect(t('COPY-shell.skip', undefined, 'vi-VN')).toBe('Chuyển đến nội dung');
    expect(t('COPY-shell.themeToggle', { theme: 'light' })).toBe('Switch to light theme');
    expect(t('COPY-shell.themeToggle', { theme: 'sáng' }, 'vi-VN')).toBe('Chuyển sang giao diện sáng');
    expect(tBoth('COPY-nav.settings')).toEqual({ 'en-US': 'Settings', 'vi-VN': 'Cài đặt' });
    expect(() => (t as (id: string, p?: object) => string)('COPY-shell.themeToggle', {})).toThrow(
      /missing value for \{theme\}/,
    );
  });
});

describe('project.schema.json -> domain types', () => {
  it('uses the ADR-0005 generator options', async () => {
    const ts = await renderDomainTypes(
      JSON.parse(read('specs/10-domain/project.schema.json')),
      join(root, 'specs/10-domain'),
    );
    expect(ts).toContain('export type IsoDate = string;'); // customName: no `Date` shadowing
    expect(ts).not.toMatch(/export type Date\b/);
    expect(ts).toMatch(/export interface PersonalData \{/);
    expect(ts.split('\n').length).toBeLessThan(500); // maxItems: -1, no tuple expansion (F-019 localized text adds ~40 lines)
  });
});

describe('generated files', () => {
  it('the committed generated files match the specs (CI staleness guard)', async () => {
    const tokens = await flattenTokens(tokensJson());
    expect(read('src/generated/tokens.css')).toBe(renderTokensCss(tokens));
    expect(read('src/generated/tokens.ts')).toBe(renderTokensTs(tokens));
    expect(read('src/generated/copy.ts')).toBe(renderCopyModule(parseCopy(read('specs/30-experience/copy.md'))));
    expect(read('src/generated/domain.ts')).toBe(
      await renderDomainTypes(JSON.parse(read('specs/10-domain/project.schema.json')), join(root, 'specs/10-domain')),
    );
  });
});

describe('dependencies.md -> notices', () => {
  it('reads package names from registry cells', () => {
    expect(packageNames('workbox-precaching, workbox-routing')).toEqual(['workbox-precaching', 'workbox-routing']);
    expect(packageNames('@axe-core/playwright (pulls axe-core)')).toEqual(['@axe-core/playwright', 'axe-core']);
    expect(packageNames('lightningcss (via vite)')).toEqual(['lightningcss']);
    expect(packageNames('~~UI typeface placeholder~~, replaced')).toEqual([]);
  });

  it('lists shipped and attribution-required packages, never dev-only ones', () => {
    const rows = parseRegistry(read('specs/40-technical/dependencies.md'));
    const installed = new Set([
      'preact',
      '@fontsource-variable/manrope',
      'caniuse-lite',
      'vitest',
      'json-schema-to-typescript',
    ]);
    const text = renderNotices(rows, (name) =>
      installed.has(name) ? { name, version: '1.0.0', license: 'X', licenseText: `${name} license text` } : undefined,
    );
    expect(text).toContain('preact 1.0.0  (DEP-03, X)');
    expect(text).toContain('@fontsource-variable/manrope 1.0.0  (DEP-34, X)');
    expect(text).toContain('caniuse-lite 1.0.0  (DEP-32, X)');
    expect(text).not.toContain('vitest');
    expect(text).not.toContain('json-schema-to-typescript');
  });
});
