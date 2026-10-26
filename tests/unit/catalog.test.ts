// F-002 Browse the catalog: SCR-Catalog's build-time view (MOD-Pages over MOD-Content), the catalog data file the
// search island reads (MOD-Content with MOD-Search keys), and the static page body rendered through Astro's
// container API with the fixture content (tests/fixtures/content/F005-favorites).
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { join } from 'node:path';
import { pick } from '../../src/modules/language/languages.ts';
import { describe, expect, test } from 'vitest';
import { catalogDataFile, loadRegistry } from '../../src/modules/content/index.ts';
import CatalogView from '../../src/modules/pages/catalog/CatalogView.astro';
import { catalogView } from '../../src/modules/pages/catalog/catalog.ts';
import { searchKeys } from '../../src/modules/search/index.ts';
import { en } from './lang-html.ts';

const cat = (id: string, name: string, order: number, tint: 'violet' | 'mango' | 'sky' | 'mint') => ({
  id,
  name,
  order,
  intro: `${name} intro.`,
  icon: 'icons/code.svg',
  tint,
});
const tool = (id: string, name: string, category: string, hidden = false) => ({ id, name, category, hidden });

const categories = [
  cat('media', 'Media tools', 2, 'mango'),
  cat('developer', 'Developer tools', 1, 'violet'),
  cat('converters', 'Converters & calculators', 3, 'sky'),
  cat('productivity', 'Productivity & relax', 4, 'mint'),
];
const tools = [
  tool('clip', 'Clip Maker', 'media'),
  tool('audio', 'Audio Trimmer', 'media'),
  tool('secret-media', 'A secret media tool', 'media', true),
  tool('regex', 'Regex Tester', 'developer'),
  tool('json', 'JSON Formatter', 'developer'),
  tool('base64', 'Base64', 'developer'),
  tool('units', 'Unit Converter', 'converters', true),
];

const root = join(import.meta.dirname, '../..');
const fixture = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const empty = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F010_AC6-no-note-no-tools') });

async function renderView(props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ name: '@astrojs/preact', renderer: preact });
  container.addClientRenderer({ name: '@astrojs/preact', entrypoint: '@astrojs/preact/client.js' });
  return en(await container.renderToString(CatalogView, { props }));
}
const viewProps = (r: typeof fixture) => ({
  view: catalogView(r.categories, r.visibleTools),
  icons: Object.fromEntries(r.categories.map((c) => [c.id, '<svg></svg>'])),
  dataUrl: '/data/catalog.test.json',
});

describe('F-002 catalog view (derivations)', () => {
  const view = catalogView(categories, tools);

  test('F002_AC1 tools appear under their category, in category order and alphabetically within each', () => {
    expect(view.groups.map((g) => g.category.name)).toEqual(['Developer tools', 'Media tools']);
    expect(view.groups.map((g) => g.tools.map((t) => t.name))).toEqual([
      ['Base64', 'JSON Formatter', 'Regex Tester'],
      ['Audio Trimmer', 'Clip Maker'],
    ]);
    expect(view.empty).toBe(false);
  });

  test('F002_AC3 F002_AC4 the navigation and every heading lead to the category pages', () => {
    expect(view.groups.map((g) => g.path)).toEqual(['/tools/developer/', '/tools/media/']);
    expect(view.nav.map((n) => [pick(n.name, 'en-US'), n.href, pick(n.count, 'en-US')])).toEqual([
      ['Developer tools', '/tools/developer/', '3 tools'],
      ['Media tools', '/tools/media/', '2 tools'],
    ]);
  });

  test('RULE-06 hidden tools and categories without visible tools are left out', () => {
    const names = view.groups.flatMap((g) => g.tools.map((t) => t.id));
    expect(names).not.toContain('secret-media');
    expect(names).not.toContain('units');
    expect(view.nav.map((n) => n.id)).not.toContain('converters');
    expect(view.total).toBe(5);
  });

  test('F002_AC8 with no visible tools the view is empty', () => {
    const none = catalogView(categories, [tool('units', 'Unit Converter', 'converters', true)]);
    expect(none).toMatchObject({ empty: true, groups: [], nav: [], total: 0 });
  });
});

describe('F-002 catalog data file (MOD-Content emit, MOD-Search keys)', () => {
  const file = catalogDataFile(fixture);
  const data = JSON.parse(file.json) as { tools: { id: string; keys: unknown }[]; categories: { id: string }[] };

  test('RULE-06 the file holds visible tools only, each with its pre-normalized search keys', () => {
    expect(data.tools.map((t) => t.id)).toEqual(fixture.visibleTools.map((t) => t.id));
    expect(data.tools.map((t) => t.id)).not.toContain('fx-hidden');
    for (const t of fixture.visibleTools) expect(data.tools.find((d) => d.id === t.id)?.keys).toEqual(searchKeys(t));
    expect(data.categories.map((c) => c.id)).toEqual(fixture.categories.map((c) => c.id));
  });

  test('ADR-0002 the address is content-hashed under /data/', () => {
    expect(file.path).toBe(`/data/catalog.${file.hash}.json`);
    expect(file.hash).toMatch(/^[0-9a-f]{10}$/);
    expect(catalogDataFile(fixture).hash).toBe(file.hash);
    expect(catalogDataFile(empty).hash).not.toBe(file.hash);
  });
});

describe('F-002 SCR-Catalog page body (static HTML)', () => {
  test('F002_AC1 the static list groups the fixture tools by category, in category order', async () => {
    const html = await renderView(viewProps(fixture));
    expect(html).toContain('My tools');
    const headings = [...html.matchAll(/<h2[^>]*>[\s\S]*?<a[^>]*href="(\/tools\/[^"]+\/)"/g)].map((m) => m[1]);
    expect(headings).toEqual(fixture.categories.map((c) => `/tools/${c.id}/`));
  });

  test('F002_AC2 a linked tool is marked as opening in a new tab', async () => {
    const html = await renderView(viewProps(fixture));
    const linked = fixture.visibleTools.find((t) => t.openMode === 'linked');
    expect(linked).toBeDefined();
    expect(html).toContain(`href="${linked!.url}" target="_blank"`);
    expect(html).toContain('Opens in a new tab');
  });

  test('F002_AC8 with no visible tools the empty state is shown and there is no category navigation', async () => {
    const html = await renderView(viewProps(empty));
    expect(html).toMatch(/I(&#39;|')m still building my first tools\. Check back soon\./);
    expect(html).toContain('class="tk-state"');
    expect(html).not.toContain('aria-label="Categories"');
  });
});
