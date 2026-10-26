// F-016 category pages: the build-time derivations behind /tools/<category-id>/ (MOD-Pages over MOD-Content),
// the tool count copy, and CMP-CategoryTile's compact variant rendered through Astro's container API.
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import { categoryPages, toolCountText } from '../../src/modules/pages/category.ts';
import CategoryTile from '../../src/modules/design-system/CategoryTile.astro';
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
  tool('resize', 'Image Resizer', 'media'),
  tool('secret-media', 'A secret media tool', 'media', true),
  tool('json', 'JSON Formatter', 'developer'),
  tool('units', 'Unit Converter', 'converters', true),
];
const pages = categoryPages(categories, tools);
const pageOf = (id: string) => pages.find((p) => p.category.id === id);

describe('F-016 category pages (derivations)', () => {
  test('F016_AC1 every visible category gets a page at its stable address, in display order', () => {
    expect(pages.map((p) => p.path)).toEqual(['/tools/developer/', '/tools/media/']);
    expect(pageOf('media')?.category.name).toBe('Media tools');
  });

  test('F016_AC2 the tool count reads "3 tools" for three visible tools; hidden tools are not counted', () => {
    expect(pageOf('media')?.tools).toHaveLength(3);
    expect(pageOf('media')?.count['en-US']).toBe('3 tools');
    expect(toolCountText(3)).toEqual({ 'en-US': '3 tools', 'vi-VN': '3 công cụ' });
  });

  test('F016_AC2 edge: exactly one visible tool reads "1 tool"', () => {
    expect(pageOf('developer')?.count['en-US']).toBe('1 tool');
    expect(toolCountText(1)['en-US']).toBe('1 tool');
  });

  test('F016_AC3 tools are listed alphabetically: "Audio Trimmer" before "Clip Maker"', () => {
    expect(pageOf('media')?.tools.map((t) => t.name)).toEqual(['Audio Trimmer', 'Clip Maker', 'Image Resizer']);
  });

  test('F016_AC4 the category navigation lists every visible category, in display order', () => {
    expect(pageOf('media')?.nav.map((c) => c.id)).toEqual(['developer', 'media']);
    expect(pageOf('media')?.nav.map((c) => c.count['en-US'])).toEqual(['1 tool', '3 tools']);
  });

  test('F016_AC5 an unknown category id has no page (the not-found content is served)', () => {
    expect(pageOf('does-not-exist')).toBeUndefined();
  });

  test('F016_AC6 a category whose tools are all hidden has no page and is not in the navigation', () => {
    expect(pageOf('converters')).toBeUndefined();
    expect(pageOf('productivity')).toBeUndefined();
    expect(pages.flatMap((p) => p.nav.map((c) => c.id))).not.toContain('converters');
  });
});

describe('CMP-CategoryTile (compact)', () => {
  async function render(props: Record<string, unknown>) {
    const container = await AstroContainer.create();
    container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
    return en(await container.renderToString(CategoryTile, { props }));
  }
  const base = {
    name: 'Media tools',
    href: '/tools/media/',
    count: { 'en-US': '3 tools', 'vi-VN': '3 công cụ' },
    tint: 'mango',
    iconSvg: '<svg></svg>',
  };

  test('one link to the category page whose name reads "<name>, <count>", tint as a decorative attribute', async () => {
    const html = await render(base);
    expect(html).toMatch(/<a href="\/tools\/media\/"[^>]*class="tk-cattile"[^>]*data-tint="mango"/);
    expect(html).toMatch(/<a [^>]*aria-label="Media tools, 3 tools"/);
    expect(html).toMatch(/<a [^>]*data-l-aria-label-vi-VN="Media tools, 3 công cụ"/);
    expect(html).toMatch(/<\/span>Media tools\s*<\/a>/);
    expect(html).not.toContain('aria-current');
  });

  test('the current category is marked with aria-current', async () => {
    const html = await render({ ...base, current: true });
    expect(html).toMatch(/<a href="\/tools\/media\/"[^>]*aria-current="page"/);
  });
});
