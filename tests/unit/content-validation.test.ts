// MOD-Content validator (F-001.R2, R3, R5): each failing fixture overlays the valid base content.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentErrors, loadRegistry, type Registry } from '../../src/modules/content/index.ts';

const root = join(import.meta.dirname, '../..');
const fixtures = join(root, 'tests/fixtures/content');
const tmpDirs: string[] = [];

/** Builds a content folder from the valid base plus an overlay fixture, and loads it. */
function load(overlay?: string): Registry {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-content-'));
  tmpDirs.push(dir);
  const contentDir = join(dir, 'content');
  cpSync(join(fixtures, 'valid'), contentDir, { recursive: true });
  if (overlay) cpSync(join(fixtures, overlay), contentDir, { recursive: true });
  return loadRegistry({ root, contentDir });
}

/** Loads a fixture that must fail, and returns the formatted error lines. */
function failures(overlay: string): string[] {
  try {
    load(overlay);
  } catch (e) {
    if (e instanceof ContentErrors)
      return e.message
        .split('\n')
        .slice(1)
        .map((l) => l.trim());
    throw e;
  }
  throw new Error(`${overlay}: expected the content to fail validation`);
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('MOD-Content validation', () => {
  it('accepts the valid base content', () => {
    const r = load();
    expect(r.allTools.map((t) => t.id).sort()).toEqual(['excalidraw', 'json', 'secret', 'units']);
  });

  it('F001_AC2 fails on a duplicated id and names both entries and the id', () => {
    const lines = failures('F001_AC2-duplicate-id');
    expect(lines).toContainEqual(
      expect.stringMatching(
        /^content\/tools\/json-copy\.yaml:\d+ › json › INV-01: duplicate id "json"; also used by content\/tools\/json\.yaml$/,
      ),
    );
    expect(lines).toContainEqual(
      expect.stringMatching(
        /^content\/tools\/json\.yaml:\d+ › json › INV-01: duplicate id "json"; also used by content\/tools\/json-copy\.yaml$/,
      ),
    );
  });

  it('F001_AC3 fails on a tool address that is not secure and names the entry', () => {
    expect(failures('F001_AC3-insecure-address')).toEqual([
      'content/tools/units.yaml:7 › units › INV-02: url "http://units.tarokit.app/" is not a secure https address',
    ]);
  });

  it('F001_AC5 fails on an external tool declared as embedded and names the entry', () => {
    const lines = failures('F001_AC5-external-embedded');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(
      /^content\/tools\/excalidraw\.yaml:9 › excalidraw › RULE-07: an external tool cannot have openMode "embedded"/,
    );
  });

  it('F001_AC7 fails on a missing category and names the entry and the category', () => {
    expect(failures('F001_AC7-unknown-category')).toEqual([
      'content/tools/units.yaml:6 › units › INV-07: category "finance" does not exist in content/categories.yaml',
    ]);
  });

  it('F001_AC8 fails when updated is before added and names the entry', () => {
    expect(failures('F001_AC8-updated-before-added')).toEqual([
      'content/tools/json.yaml:10 › json › INV-06: updated 2026-01-02 is before added 2026-02-01',
    ]);
  });

  it('F001_AC9 fails when two categories share a tint and names both categories', () => {
    const lines = failures('F001_AC9-shared-tint');
    expect(lines).toEqual([
      'content/categories.yaml:3 › media › RULE-14: tint "mango" is shared by categories "media" and "converters"',
      'content/categories.yaml:4 › converters › RULE-14: tint "mango" is shared by categories "media" and "converters"',
    ]);
  });

  it('INV-03 fails on an embedded tool served from the portal origin', () => {
    expect(failures('INV03-portal-origin')).toEqual([
      'content/tools/self.yaml:7 › self-hosted › INV-03: an embedded tool must not be served from the portal origin https://tarokit.app',
    ]);
  });

  it('reports every error at once, not only the first', () => {
    const lines = failures('two-errors');
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).toContain('› json › INV-06');
    expect(lines.join('\n')).toContain('› units › INV-02');
  });

  it('fails on a misspelled field instead of silently defaulting', () => {
    expect(failures('typo-field')).toEqual([
      'content/tools/units.yaml:9 › units › SCHEMA: (root): unknown field "opnMode"',
    ]);
  });
});

describe('MOD-Content normalization', () => {
  it('RULE-07 opens an own tool with no open mode embedded, and an external tool linked', () => {
    const r = load();
    expect(r.allTools.find((t) => t.id === 'json')?.openMode).toBe('embedded');
    expect(r.allTools.find((t) => t.id === 'excalidraw')?.openMode).toBe('linked');
    expect(r.allTools.find((t) => t.id === 'units')?.openMode).toBe('linked');
  });

  it('INV-03 defaults: no permissions, not offline-capable', () => {
    const json = load().toolById('json');
    expect(json?.permissions).toEqual([]);
    expect(json?.offline).toBe(false);
  });

  it('RULE-06 keeps hidden tools and empty categories out of every derived view', () => {
    const r = load();
    expect(r.visibleTools.map((t) => t.id)).not.toContain('secret');
    expect(r.toolById('secret')).toBeUndefined();
    expect(r.categories.map((c) => c.id)).toEqual(['developer', 'converters', 'productivity']);
    expect(r.changelogEvents.map((e) => e.id)).not.toContain('secret');
    expect(r.embeddedOrigins).toEqual(['https://json.tarokit.app']);
  });
});

describe('repository content', () => {
  it('the sample content validates, with one visible sample tool per category (D-012)', () => {
    const r = loadRegistry({ root });
    expect(r.categories.map((c) => [c.id, c.tools.length])).toEqual([
      ['developer', 1],
      ['media', 1],
      ['converters', 1],
      ['productivity', 1],
    ]);
    // Visible tools are samples; real tools may be present while hidden until deployed (D-012).
    expect(r.allTools.filter((t) => !t.hidden).every((t) => t.id.startsWith('sample-'))).toBe(true);
    expect(r.projects).toEqual([]);
  });
});
