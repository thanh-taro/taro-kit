// F-011 install and offline (MOD-Offline, MOD-Shell's status, CMP-ToolCard's unavailable state): the web app
// manifest, the precache list, the cache rules in `_headers`, and the offline/update UI before the browser runs it.
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import ToolCard from '../../src/modules/design-system/ToolCard.astro';
import { needsInternet } from '../../src/modules/design-system/tool-card.ts';
import { MANIFEST_ICONS, webManifest } from '../../src/modules/offline/manifest.ts';
import { precacheEntries, PRECACHE_IGNORES } from '../../src/modules/offline/precache.ts';
import { online, updateReady } from '../../src/modules/offline/state.ts';
import { cacheRules, headersFile } from '../../src/modules/security-policy/index.ts';
import AppShell from '../../src/modules/shell/AppShell.astro';
import StatusIsland from '../fixtures/shell/StatusIsland.astro';

const root = join(import.meta.dirname, '../..');

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return container.renderToString(component, { props });
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

const tool = (over: Partial<{ openMode: 'embedded' | 'linked'; offline: boolean }> = {}) => ({
  id: 'units',
  name: 'Unit Converter',
  summary: 'Convert units.',
  openMode: 'embedded' as const,
  url: 'https://units.tarokit.app/',
  ...over,
});

describe('F-011 web app manifest', () => {
  test('F011_AC1 the manifest makes the portal installable as TaroKit, in its own window, from /', () => {
    const m = webManifest();
    expect(m).toMatchObject({
      id: '/',
      name: 'TaroKit',
      short_name: 'TaroKit',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    });
    // Values come from the design tokens (dark is the default theme, style.md).
    expect(m.background_color).toBe('#0F0B16');
    expect(m.theme_color).toBe('#0F0B16');
  });

  test('F011_AC1 the manifest lists the 192, 512 and maskable icons, and each committed file has that size', () => {
    const icons = webManifest().icons;
    expect(icons).toEqual(MANIFEST_ICONS);
    expect(icons.map((i) => `${i.sizes} ${i.purpose ?? 'any'}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ]);
    for (const icon of icons) {
      expect(icon.type).toBe('image/png');
      const [w, hgt] = pngSize(join(root, 'public', icon.src));
      expect(`${w}x${hgt}`).toBe(icon.sizes);
    }
  });
});

describe('F-011 precache (NFR-06)', () => {
  let dist: string;
  const put = (path: string, body = 'x') => {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), body);
  };
  beforeEach(() => {
    dist = mkdtempSync(join(tmpdir(), 'tk-precache-'));
  });
  afterAll(() => {
    if (dist) rmSync(dist, { recursive: true, force: true });
  });

  test('F011_AC2 F011_AC4 F011_AC8 the precache holds every page, the not-found page, the catalog data, assets and project images', async () => {
    for (const p of [
      'index.html',
      '404.html',
      'tools/index.html',
      'tools/media/index.html',
      't/sample-dev/index.html',
      'data/catalog.0123456789.json',
      '_astro/client.abc.js',
      '_astro/index.abc.css',
      '_astro/manrope-latin.abc.woff2',
      '_astro/avatar.abc.webp',
      'projects/images/pocket-budget.jpg',
      'projects/images/tiny-synth.png',
      'icons/icon-192.png',
      'manifest.webmanifest',
    ])
      put(p);
    // Never precached: the worker itself, host config, and files no page loads.
    for (const p of ['sw.js', '_headers', 'sitemap.xml', 'robots.txt', 'third-party-notices.txt']) put(p);

    const entries = await precacheEntries(dist);
    const urls = entries.map((e) => e.url).sort();
    expect(urls).toEqual(
      [
        '404.html',
        '_astro/avatar.abc.webp',
        '_astro/client.abc.js',
        '_astro/index.abc.css',
        '_astro/manrope-latin.abc.woff2',
        'data/catalog.0123456789.json',
        'icons/icon-192.png',
        'index.html',
        'manifest.webmanifest',
        'projects/images/pocket-budget.jpg',
        'projects/images/tiny-synth.png',
        't/sample-dev/index.html',
        'tools/index.html',
        'tools/media/index.html',
      ].sort(),
    );
    // Hashed names need no revision; every other entry has one (a new version re-fetches only what changed).
    for (const e of entries) {
      if (e.url.startsWith('_astro/')) expect(e.revision).toBeNull();
      else expect(e.revision).toMatch(/^[0-9a-f]{32}$/);
    }
    expect(PRECACHE_IGNORES).toContain('sw.js');
  });
});

describe('F-011 cache rules in _headers (ADR-0007, MOD-SecurityPolicy)', () => {
  test('ADR-0007 sw.js, the manifest and HTML are revalidated; hashed assets are immutable', () => {
    const rules = Object.fromEntries(cacheRules().map(({ path, cacheControl }) => [path, cacheControl]));
    expect(rules['/sw.js']).toBe('no-cache, no-transform');
    expect(rules['/manifest.webmanifest']).toBe('no-cache, no-transform');
    expect(rules['/*']).toBe('no-cache, no-transform');
    expect(rules['/_astro/*']).toBe('public, max-age=31536000, immutable, no-transform');
    expect(rules['/data/*']).toBe('public, max-age=31536000, immutable, no-transform');
  });

  test('ADR-0007 each path gets exactly one Cache-Control: later rules detach the default first', () => {
    const file = headersFile([]);
    // Cloudflare merges every matching rule; `! Cache-Control` removes the default before a path sets its own.
    const sw = file.slice(file.indexOf('\n/sw.js\n'));
    expect(sw).toMatch(/^\n\/sw\.js\n {2}! Cache-Control\n {2}Cache-Control: no-cache, no-transform\n/);
    expect(file).toMatch(
      /\n\/_astro\/\*\n {2}! Cache-Control\n {2}Cache-Control: public, max-age=31536000, immutable, no-transform\n/,
    );
    expect(file.startsWith('/*\n')).toBe(true);
    expect(file).toContain('  Cache-Control: no-cache, no-transform\n');
  });
});

describe('F-011 unavailable tools (CMP-ToolCard)', () => {
  test('F011_AC5 linked tools and embedded tools that are not offline-capable need the internet', () => {
    expect(needsInternet(tool({ openMode: 'linked' }))).toBe(true);
    expect(needsInternet(tool({ openMode: 'linked', offline: true }))).toBe(true);
    expect(needsInternet(tool())).toBe(true);
    expect(needsInternet(tool({ offline: false }))).toBe(true);
    expect(needsInternet(tool({ offline: true }))).toBe(false);
  });

  test('F011_AC5 a static card of a tool that needs the internet carries its hidden unavailable note', async () => {
    const html = await render(ToolCard, { tool: tool() });
    const id = html.match(/data-tk-needs-internet="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(
      new RegExp(`<span id="${id}" class="tk-toolcard__unavailable" hidden(="")?>.*Needs the internet`),
    );
    // Online it is not part of the link's description.
    expect(html).not.toMatch(new RegExp(`aria-describedby="[^"]*${id}`));
    expect(html).not.toContain('data-unavailable');
  });

  test('F011_AC5 an offline-capable embedded tool card has no unavailable note', async () => {
    const html = await render(ToolCard, { tool: tool({ offline: true }) });
    expect(html).not.toContain('data-tk-needs-internet');
    expect(html).not.toContain('Needs the internet');
  });

  // The live switch on static cards (tool-card-availability.ts) is verified in the browser: e2e F011_AC5.
});

describe('F-011 shell status (CMP-AppShell offline and update ready)', () => {
  // Rendered without hydration, with MOD-Offline's signals set first: the markup the island shows in each state.
  const status = (place: 'header' | 'below') => render(StatusIsland, { place });
  beforeEach(() => {
    online.value = true;
    updateReady.value = false;
  });

  test('F011_AC5 online, the status regions are empty; offline, the quiet indicator shows COPY-shell.offline', async () => {
    expect(await status('header')).toMatch(/<span class="tk-status tk-status--pill" role="status"><\/span>/);
    online.value = false;
    const html = await status('header');
    expect(html).toMatch(
      /<span class="tk-status tk-status--pill" role="status">.*You(&#39;|’|')re offline\. Tools that need the internet are paused\./,
    );
  });

  test('F011_AC6 a waiting version shows COPY-shell.updateReady with the COPY-shell.refresh action', async () => {
    expect(await status('below')).not.toContain('Refresh');
    updateReady.value = true;
    expect(await status('below')).toMatch(
      /role="status"[^>]*>.*I(&#39;|’|')ve shipped an update to TaroKit\..*<button type="button"[^>]*>Refresh<\/button>/,
    );
  });

  test('F011_AC5 F011_AC6 the shell mounts the status island in the header and below it, on every variant', async () => {
    for (const variant of ['full', 'compact']) {
      const html = await render(AppShell, { path: '/', variant });
      const islands = [...html.matchAll(/<astro-island [^>]*component-url="[^"]*ShellStatus\.tsx"/g)];
      expect(islands).toHaveLength(2);
      expect(html.indexOf('ShellStatus.tsx')).toBeLessThan(html.indexOf('</header>'));
      expect(html.lastIndexOf('ShellStatus.tsx')).toBeGreaterThan(html.indexOf('</header>'));
    }
  });
});
