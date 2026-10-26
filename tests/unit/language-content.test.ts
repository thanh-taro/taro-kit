// MOD-Content, F-019: localized content (INV-09, ADR-0005 note from F-019). Each fixture overlays the valid base.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ContentErrors, loadRegistry, type Registry } from '../../src/modules/content/index.ts';

const root = join(import.meta.dirname, '../..');
const fixtures = join(root, 'tests/fixtures/content');
const tmpDirs: string[] = [];

function load(overlay?: string): Registry {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-content-'));
  tmpDirs.push(dir);
  const contentDir = join(dir, 'content');
  cpSync(join(fixtures, 'valid'), contentDir, { recursive: true });
  if (overlay) cpSync(join(fixtures, overlay), contentDir, { recursive: true });
  return loadRegistry({ root, contentDir });
}

function failures(overlay: string): string[] {
  try {
    load(overlay);
  } catch (e) {
    if (e instanceof ContentErrors) return e.errors.map((x) => `${x.file} › ${x.entryId} › ${x.rule}: ${x.message}`);
    throw e;
  }
  throw new Error(`${overlay}: expected the content to fail validation`);
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('INV-09 localized content', () => {
  it('F019_AC18 a tool entry with no Vietnamese summary fails, naming the file, the entry, the field and INV-09', () => {
    expect(failures('F019_AC18-no-vi-summary')).toEqual([
      'content/tools/json.yaml › json › INV-09: summary has no vi-VN version',
    ]);
  });

  it('INV-09 a summary written once (a plain string) fails: it must have both versions', () => {
    expect(failures('INV09-plain-summary')).toEqual([
      'content/tools/json.yaml › json › INV-09: summary must have an en-US and a vi-VN version',
    ]);
  });

  it('INV-09 an empty version fails, naming the field', () => {
    expect(failures('INV09-empty-version')).toEqual(['content/now.yaml › - › INV-09: body has an empty vi-VN version']);
  });

  it('INV-09 a name written per language needs both versions; a name written once is fine', () => {
    expect(failures('INV09-name-missing-version')).toEqual([
      'content/profile.yaml › - › INV-09: location has no vi-VN version',
    ]);
    // The valid base writes the profile links' labels once.
    expect(load().profile.links[0]!.label).toBe('Email');
  });

  it("INV-09 a tool's name has exactly one version", () => {
    expect(failures('INV09-tool-name-map')).toEqual([
      'content/tools/json.yaml › json › INV-09: name must be one text for both languages',
    ]);
  });

  it('INV-09 links in a Vietnamese policy body are checked too (INV-02), naming the section and the language', () => {
    expect(failures('INV09-policy-vi-link')).toEqual([
      'content/privacy.yaml › section 2 › INV-02: link "http://www.cloudflare.com/privacypolicy/" is not https (vi-VN)',
    ]);
  });

  it('INV-09 text is normalized to NFC before lengths are checked (ADR-0005 note)', () => {
    const r = load('INV09-nfc');
    const vi = r.toolById('json')!.summary['vi-VN'];
    expect(vi.length).toBe(120);
    expect(vi).toBe(vi.normalize('NFC'));
  });

  it('INV-09 the valid base loads with both versions of every localized text', () => {
    const r = load();
    const json = r.toolById('json')!;
    expect(Object.keys(json.summary).sort()).toEqual(['en-US', 'vi-VN']);
    expect(typeof json.name).toBe('string');
    expect(Object.keys(r.categories[0]!.name).sort()).toEqual(['en-US', 'vi-VN']);
    expect(Object.keys(r.privacy.sections[0]!.blocks).sort()).toEqual(['en-US', 'vi-VN']);
  });
});
