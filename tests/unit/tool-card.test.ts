// CMP-ToolCard and CMP-FavoriteToggle rendering (MOD-DesignSystem) through Astro's container API, and the
// visible-tool-ids module that islands read (MOD-Content).
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import { visibleToolIds } from 'virtual:tarokit/visible-tool-ids';
import { getRegistry, visibleToolIdsSource } from '../../src/modules/content/index.ts';
import FavoriteToggle from '../../src/modules/design-system/FavoriteToggle.astro';
import ToolCard from '../../src/modules/design-system/ToolCard.astro';
import SameToolTwice from '../fixtures/design-system/SameToolTwice.astro';
import { favoriteToggleLabels } from '../../src/modules/design-system/text.ts';
import { monogram, toolCardLink } from '../../src/modules/design-system/tool-card.ts';

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return container.renderToString(component, { props });
}

const embedded = {
  id: 'units',
  name: 'Unit Converter',
  summary: 'Convert units.',
  openMode: 'embedded' as const,
  url: 'https://units.tarokit.app/',
};
const linked = {
  ...embedded,
  id: 'loan',
  name: 'Loan Calculator',
  openMode: 'linked' as const,
  url: 'https://loan.example/',
};

describe('CMP-ToolCard', () => {
  test('CMP-ToolCard links an embedded tool to its portal address and a linked tool to its own, in a new tab', () => {
    expect(toolCardLink(embedded)).toEqual({ href: '/t/units/', newTab: false });
    expect(toolCardLink(linked)).toEqual({ href: 'https://loan.example/', newTab: true });
  });

  test('CMP-ToolCard a tool without an icon shows its monogram (style.md)', () => {
    expect(monogram('Unit Converter')).toBe('UC');
    expect(monogram('base64')).toBe('B');
    expect(monogram('  JSON  Formatter Pro ')).toBe('JF');
  });

  test('CMP-ToolCard regular: one link named by the tool, summary, category label, and an off toggle', async () => {
    const html = await render(ToolCard, { tool: embedded, categoryName: 'Converters' });
    expect(html).toMatch(/<div class="tk-toolcard" data-variant="regular"/);
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(/<a class="tk-toolcard__link" href="\/t\/units\/"[^>]*>Unit Converter<\/a>/);
    expect(html).toContain('<p class="tk-toolcard__summary">Convert units.</p>');
    expect(html).toContain('<span class="tk-toolcard__category">Converters</span>');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-label="Add to favorites"');
    expect(html).not.toContain('Opens in a new tab');
    expect(html).not.toContain('target="_blank"');
  });

  test('CMP-ToolCard regular linked: visible marker that describes the link', async () => {
    const html = await render(ToolCard, { tool: linked, categoryName: 'Calculators' });
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(html).toContain('href="https://loan.example/" target="_blank" rel="noopener noreferrer"');
    expect(html).toMatch(new RegExp(`<span id="${describedBy}" class="tk-toolcard__newtab">Opens in a new tab`));
  });

  test('CMP-ToolCard compact: icon, name and toggle only; the linked marker is screen-reader text', async () => {
    const html = await render(ToolCard, { tool: linked, variant: 'compact', categoryName: 'Calculators' });
    expect(html).toMatch(/data-variant="compact"/);
    expect(html).not.toContain('tk-toolcard__summary');
    expect(html).not.toContain('tk-toolcard__category');
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(html).toContain(`<span id="${describedBy}" class="tk-visually-hidden">Opens in a new tab</span>`);
    expect(html).toContain('data-size="sm"');
  });

  test('CMP-ToolCard unavailable: dimmed, with COPY-tool.unavailable describing the link, toggle kept', async () => {
    const html = await render(ToolCard, { tool: linked, categoryName: 'Calculators', unavailable: true });
    expect(html).toContain('data-unavailable');
    const ids = html.match(/aria-describedby="([^"]+)"/)?.[1].split(' ');
    expect(ids).toHaveLength(2);
    expect(html).toMatch(new RegExp(`<span id="${ids?.[1]}" class="tk-toolcard__unavailable">.*Needs the internet`));
    expect(html).toContain('class="tk-fav__btn"');
  });

  test('CMP-ToolCard ids are unique when the same tool is shown twice on a page', async () => {
    const html = await render(SameToolTwice);
    const ids = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(html).toContain(`id="${id}"`);
  });

  test('CMP-ToolCard static cards hydrate only the favorite toggle', async () => {
    const html = await render(ToolCard, { tool: embedded });
    expect(html.match(/<astro-island /g)).toHaveLength(1);
    expect(html).toMatch(/<astro-island [^>]*component-url="[^"]*FavoriteToggle\.tsx"/);
    expect(html.indexOf('<div class="tk-toolcard"')).toBeLessThan(html.indexOf('<astro-island'));
  });
});

describe('CMP-FavoriteToggle', () => {
  test('CMP-FavoriteToggle framed renders a disabled off toggle before hydration, with the full message ready', async () => {
    const html = await render(FavoriteToggle, { toolId: 'units' });
    expect(html).toMatch(/<span class="tk-fav" data-appearance="framed" data-size="md">/);
    expect(html).toMatch(
      /<button type="button" class="tk-fav__btn" aria-pressed="false" aria-label="Add to favorites" disabled/,
    );
    expect(html).toMatch(/<span id="[^"]+" class="tk-fav__full" role="status"><\/span>/);
    expect(html).toContain('<svg class="tk-icon" width="20" height="20"');
  });
});

describe('CMP-FavoriteToggle labels', () => {
  test('CMP-FavoriteToggle labels come from COPY-fav.add, COPY-fav.remove and COPY-fav.full with the RULE-02 limit', () => {
    expect(favoriteToggleLabels()).toEqual({
      add: 'Add to favorites',
      remove: 'Remove from favorites',
      full: 'You can keep up to 24 favorites. Unpin one to make room.',
    });
  });
});

describe('visible tool ids for islands (MOD-Content)', () => {
  test('INV-04 the module lists exactly the visible tools of this build, hidden ones left out', () => {
    const registry = getRegistry();
    expect(visibleToolIds).toEqual(registry.visibleTools.map((t) => t.id));
    for (const hidden of registry.allTools.filter((t) => t.hidden)) expect(visibleToolIds).not.toContain(hidden.id);
  });

  test('the module source is plain data', () => {
    expect(visibleToolIdsSource(['a', 'b'])).toBe('export const visibleToolIds = ["a","b"];\n');
  });
});
