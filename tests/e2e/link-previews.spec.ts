// F-015 Share rich link previews: the head metadata preview services read from the built HTML, the site index
// and the shared preview image. The production build (PROD) is checked for every public page; the fixture build
// (FX, tests/fixtures/content/F005-favorites) for tools and categories. Expected values come from the registry.
// Preview crawlers don't run scripts, so every check reads the served HTML, not the live DOM.
import { join } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';
import { loadRegistry, PORTAL_ORIGIN, toolPath } from '../../src/modules/content/index.ts';
import { t } from '../../src/modules/copy/index.ts';
import { FX, PROD } from './ports.ts';

const root = join(import.meta.dirname, '../..');
const fixture = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });
const production = loadRegistry({ root, contentDir: join(root, 'content'), portalOrigin: PORTAL_ORIGIN });

interface Head {
  status: number;
  title: string | undefined;
  meta: Map<string, string>;
  canonical: string | undefined;
  head: string;
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** The served <head>, as a preview service reads it (no scripts run). */
async function readHead(request: APIRequestContext, url: string): Promise<Head> {
  const res = await request.get(url);
  const html = await res.text();
  const head = html.slice(0, html.indexOf('</head>'));
  const meta = new Map<string, string>();
  for (const m of head.matchAll(/<meta\s+([^>]+?)\/?>/g)) {
    const attrs = Object.fromEntries([...m[1]!.matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], decode(a[2]!)]));
    const key = attrs.property ?? attrs.name;
    if (key && attrs.content !== undefined) meta.set(key, attrs.content);
  }
  const title = head.match(/<title>([^<]*)<\/title>/)?.[1];
  const canonical = head.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  return { status: res.status(), title: title && decode(title), meta, canonical, head };
}

const sharedImage = `${PORTAL_ORIGIN}/preview.png`;

function expectSharedImage(h: Head) {
  expect(h.meta.get('og:image')).toBe(sharedImage);
  expect(Number(h.meta.get('og:image:width'))).toBeGreaterThanOrEqual(1200);
  expect(Number(h.meta.get('og:image:height'))).toBeGreaterThanOrEqual(630);
  expect(h.meta.get('twitter:card')).toBe('summary_large_image');
}

test.describe('F-015 link previews', () => {
  test('F015_AC1 the About page’s preview data is the About title, description and the shared image', async ({
    request,
  }) => {
    const h = await readHead(request, `${PROD}/about/`);
    expect(h.title).toBe(t('COPY-meta.aboutTitle'));
    expect(h.meta.get('og:title')).toBe(t('COPY-meta.aboutTitle'));
    expect(h.meta.get('description')).toBe(t('COPY-meta.aboutDescription'));
    expect(h.meta.get('og:description')).toBe(t('COPY-meta.aboutDescription'));
    expect(h.meta.get('og:url')).toBe(`${PORTAL_ORIGIN}/about/`);
    expect(h.canonical).toBe(`${PORTAL_ORIGIN}/about/`);
    expectSharedImage(h);
  });

  test('F015_AC2 the tool "json" portal address’s preview has its name in the title and its summary', async ({
    request,
  }) => {
    const tool = fixture.toolById('fx-json-formatter')!;
    const h = await readHead(request, `${FX}${toolPath(tool.id)}`);
    expect(h.status).toBe(200);
    expect(h.title).toContain(tool.name);
    expect(h.meta.get('og:title')).toBe(t('COPY-meta.toolTitle', { tool: tool.name }));
    expect(h.meta.get('og:description')).toBe(tool.summary);
    expect(h.meta.get('description')).toBe(tool.summary);
    expect(h.canonical).toBe(`${PORTAL_ORIGIN}${toolPath(tool.id)}`);
    expectSharedImage(h);
  });

  test('F015_AC2 a linked tool’s portal address declares its name and summary too', async ({ request }) => {
    const tool = fixture.toolById('fx-linked')!;
    expect(tool.openMode).toBe('linked');
    const h = await readHead(request, `${FX}${toolPath(tool.id)}`);
    expect(h.meta.get('og:title')).toBe(t('COPY-meta.toolTitle', { tool: tool.name }));
    expect(h.meta.get('og:description')).toBe(tool.summary);
    expectSharedImage(h);
  });

  test('F015_AC3 the site index leaves out the hidden tool and lists only portal addresses', async ({ request }) => {
    const res = await request.get(`${FX}/sitemap.xml`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    const hidden = fixture.allTools.find((tool) => tool.id === 'fx-hidden')!;
    expect(hidden.hidden).toBe(true);
    expect(xml).not.toContain(hidden.id);
    const toolLocs = locs.filter((loc) => loc.startsWith(`${PORTAL_ORIGIN}/t/`));
    expect(toolLocs.sort()).toEqual(fixture.visibleTools.map((tool) => `${PORTAL_ORIGIN}${toolPath(tool.id)}`).sort());
    for (const loc of locs) expect(loc.startsWith(`${PORTAL_ORIGIN}/`)).toBe(true);
    const robots = await (await request.get(`${FX}/robots.txt`)).text();
    expect(robots).toContain(`Sitemap: ${PORTAL_ORIGIN}/sitemap.xml`);
  });

  test('F015_AC4 a hidden tool’s portal address shows the not-found title and not the tool’s name', async ({
    request,
  }) => {
    const hidden = fixture.allTools.find((tool) => tool.id === 'fx-hidden')!;
    const h = await readHead(request, `${FX}${toolPath(hidden.id)}`);
    expect(h.status).toBe(404);
    expect(h.title).toBe(t('COPY-notFound.title'));
    expect(h.meta.get('og:title')).toBe(t('COPY-notFound.title'));
    expect(h.meta.get('robots')).toBe('noindex');
    expect(h.head).not.toContain(hidden.name);
    expect(h.head).not.toContain(hidden.summary);
    expect(h.meta.has('og:url')).toBe(false);
    expect(h.canonical).toBeUndefined();
    expectSharedImage(h);
  });

  test('F015_AC5 the Media tools category page’s preview has its name in the title and its intro', async ({
    request,
  }) => {
    const media = fixture.categories.find((c) => c.id === 'media')!;
    const h = await readHead(request, `${FX}/tools/media/`);
    expect(h.title).toContain('Media tools');
    expect(h.meta.get('og:title')).toContain('Media tools');
    expect(h.meta.get('og:description')).toBe(media.intro);
    expect(h.canonical).toBe(`${PORTAL_ORIGIN}/tools/media/`);
    expectSharedImage(h);
  });

  test('NFR-12 every page of the production build declares a short title, description and the shared image', async ({
    request,
  }) => {
    const paths = [
      '/',
      '/tools/',
      '/projects/',
      '/about/',
      '/now/',
      '/settings/',
      ...production.categories.map((c) => `/tools/${c.id}/`),
      ...production.visibleTools.map((tool) => toolPath(tool.id)),
    ];
    for (const path of paths) {
      const h = await readHead(request, `${PROD}${path}`);
      expect(h.status, path).toBe(200);
      expect(h.title?.length, path).toBeLessThanOrEqual(60);
      expect(h.meta.get('og:title'), path).toBe(h.title);
      expect(h.meta.get('og:description')?.length, path).toBeLessThanOrEqual(160);
      expect(h.meta.get('og:description'), path).toBe(h.meta.get('description'));
      expect(h.meta.get('og:url'), path).toBe(`${PORTAL_ORIGIN}${path}`);
      expect(h.meta.get('robots'), path).toBeUndefined();
      expectSharedImage(h);
    }
  });

  test('NFR-12 the shared preview image is a 1200 × 630 PNG', async ({ request }) => {
    const res = await request.get(`${PROD}/preview.png`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const info = await sharp(await res.body()).metadata();
    expect([info.format, info.width, info.height]).toEqual(['png', 1200, 630]);
  });
});
