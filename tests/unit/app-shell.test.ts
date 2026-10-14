// CMP-AppShell rendering (MOD-Shell) through Astro's container API.
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import AppShell from '../../src/modules/shell/AppShell.astro';
import ShellWithStatus from '../fixtures/shell/ShellWithStatus.astro';

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return container.renderToString(component, { props });
}

describe('CMP-AppShell', () => {
  test('the offline indicator and update message render nothing until a page fills them', async () => {
    const html = await render(AppShell, { path: '/' });
    expect(html).not.toContain('class="offline"');
    expect(html).not.toContain('class="update"');
  });

  test('filled status slots render in the header and below it', async () => {
    const html = await render(ShellWithStatus);
    expect(html).toMatch(/<div class="offline"[^>]*><span[^>]*data-test="offline"/);
    expect(html).toMatch(/<div class="update"[^>]*><span[^>]*data-test="update"/);
    expect(html.indexOf('data-test="offline"')).toBeLessThan(html.indexOf('</header>'));
    expect(html.indexOf('data-test="update"')).toBeGreaterThan(html.indexOf('</header>'));
  });

  test('the current page is marked, settings included', async () => {
    const html = await render(AppShell, { path: '/settings/' });
    expect(html).toMatch(/<a href="\/settings\/" class="tk-iconbtn settings"[^>]*aria-current="page"/);
    expect(html).not.toMatch(/<a href="\/"[^>]*aria-current="page"/);
  });

  test('SCR-Category on a category page, Tools is marked as the current section, not as the page', async () => {
    const html = await render(AppShell, { path: '/tools/media/' });
    expect(html).toMatch(/<a href="\/tools\/"[^>]*aria-current="true"/);
    expect(html).not.toMatch(/aria-current="page"/);
  });

  test('F-004.R1 the full shell has the search control with the shortcut key cap, and an icon control for narrow', async () => {
    const html = await render(AppShell, { path: '/' });
    expect(html).toMatch(/<button type="button" class="search"[^>]*data-tk-palette-open/);
    expect(html).toContain('What are you looking for?</span>');
    expect(html).toMatch(/<kbd[^>]*data-tk-shortcut[^>]*>Ctrl K<\/kbd>/);
    expect(html).toMatch(/<button[^>]*class="tk-iconbtn search-icon"[^>]*data-tk-palette-open[^>]*aria-label="Search"/);
  });

  test('F-004.R1 the compact shell (tool view) has the search control too, labelled Search', async () => {
    const html = await render(AppShell, { path: '/t/json/', variant: 'compact' });
    expect(html).toMatch(/<button type="button" class="search"[^>]*data-tk-palette-open[^>]*>[\s\S]*?Search<\/span>/);
    expect(html).not.toContain('search-icon');
  });
});
