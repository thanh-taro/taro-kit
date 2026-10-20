// F-015 link previews (MOD-Meta): the pure page metadata, head tags, site index and preview image layout.
// Fixture content: tests/fixtures/content/F005-favorites (shared); expected values come from its registry.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRegistry, PORTAL_ORIGIN, toolPath } from '../../src/modules/content/index.ts';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { t } from '../../src/modules/copy/index.ts';
import HeadMeta from '../../src/modules/meta/HeadMeta.astro';
import {
  headTags,
  metaFor,
  PREVIEW_IMAGE,
  previewSvg,
  robotsTxt,
  siteIndexXml,
  type GlyphRuns,
  type HeadTag,
} from '../../src/modules/meta/index.ts';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({
  root,
  contentDir: join(root, 'tests/fixtures/content/F005-favorites'),
  portalOrigin: PORTAL_ORIGIN,
});

/** The content of the head tag with this name or property, as preview services read it. */
const content = (tags: HeadTag[], key: string) =>
  tags.find((tag) => tag.attrs.property === key || tag.attrs.name === key)?.attrs.content;
const linkHref = (tags: HeadTag[], rel: string) => tags.find((tag) => tag.attrs.rel === rel)?.attrs.href;
const sharedImage = `${PORTAL_ORIGIN}${PREVIEW_IMAGE.path}`;

describe('F-015 page metadata', () => {
  it('F015_AC1 the About page declares the About title, description and the shared image', () => {
    const meta = metaFor({ page: 'about' }, registry);
    expect(meta).toMatchObject({
      title: t('COPY-meta.aboutTitle'),
      description: t('COPY-meta.aboutDescription'),
      path: '/about/',
    });
    const tags = headTags(meta, PORTAL_ORIGIN);
    expect(content(tags, 'og:title')).toBe(t('COPY-meta.aboutTitle'));
    expect(content(tags, 'og:description')).toBe(t('COPY-meta.aboutDescription'));
    expect(content(tags, 'description')).toBe(t('COPY-meta.aboutDescription'));
    expect(content(tags, 'og:image')).toBe(sharedImage);
    expect(content(tags, 'og:image:width')).toBe('1200');
    expect(content(tags, 'og:image:height')).toBe('630');
    expect(content(tags, 'og:url')).toBe(`${PORTAL_ORIGIN}/about/`);
    expect(linkHref(tags, 'canonical')).toBe(`${PORTAL_ORIGIN}/about/`);
    expect(content(tags, 'og:type')).toBe('website');
    expect(content(tags, 'og:site_name')).toBe(t('COPY-shell.brand'));
    expect(content(tags, 'twitter:card')).toBe('summary_large_image');
    expect(content(tags, 'robots')).toBeUndefined();
  });

  it('F-015.R1 every other public page declares its COPY title and description and the shared image', () => {
    const pages = [
      ['home', '/', 'COPY-meta.homeTitle', 'COPY-meta.homeDescription'],
      ['tools', '/tools/', 'COPY-meta.toolsTitle', 'COPY-meta.toolsDescription'],
      ['now', '/now/', 'COPY-meta.nowTitle', 'COPY-meta.nowDescription'],
      ['settings', '/settings/', 'COPY-meta.settingsTitle', 'COPY-meta.settingsDescription'],
    ] as const;
    for (const [page, path, title, description] of pages) {
      const meta = metaFor({ page }, registry);
      const noindex = page === 'settings' ? { noindex: true } : {};
      expect(meta).toEqual({ title: t(title), description: t(description), path, ...noindex });
      const tags = headTags(meta, PORTAL_ORIGIN);
      expect(content(tags, 'og:image')).toBe(sharedImage);
      expect(content(tags, 'og:url')).toBe(`${PORTAL_ORIGIN}${path}`);
      expect(content(tags, 'robots')).toBe(page === 'settings' ? 'noindex' : undefined);
    }
  });

  it('F-015.R1 tool names and descriptions are escaped in <title> and in every attribute', async () => {
    const tricky = { title: 'A "q" & <b> — TaroKit', description: 'Sum "x" & <y> > z.', path: '/t/tricky/' };
    const container = await AstroContainer.create({ astroConfig: { site: PORTAL_ORIGIN } });
    const html = await container.renderToString(HeadMeta, {
      props: tricky,
      request: new Request(`${PORTAL_ORIGIN}/t/tricky/`),
    });
    // Text content: every special character is escaped.
    expect(html).toContain('<title>A &quot;q&quot; &amp; &lt;b&gt; — TaroKit</title>');
    // Attributes: quotes and ampersands are escaped, so a value cannot end its attribute early; inside a quoted
    // value, < and > are plain text (HTML spec), and Astro leaves them as they are.
    const attrs = [...html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)];
    const decoded = Object.fromEntries(attrs.map((m) => [m[1], m[2]!.replace(/&quot;/g, '"').replace(/&amp;/g, '&')]));
    for (const key of ['description', 'og:description']) expect(decoded[key]).toBe(tricky.description);
    expect(decoded['og:title']).toBe(tricky.title);
    expect(html).toContain('content="Sum &quot;x&quot; &amp; ');
    // Outside attribute values, no markup from the text survives.
    expect(html.replace(/"[^"]*"/g, '""')).not.toMatch(/<b>|<y>/);
  });

  it('F015_AC2 the tool "json" declares its name in the title and its summary as the description', () => {
    const tool = registry.toolById('fx-json-formatter');
    expect(tool && !tool.hidden).toBe(true);
    const meta = metaFor({ page: 'tool', id: 'fx-json-formatter' }, registry);
    expect(meta.title).toBe(t('COPY-meta.toolTitle', { tool: tool!.name }));
    expect(meta.title).toContain(tool!.name);
    expect(meta.description).toBe(tool!.summary);
    expect(meta.path).toBe(toolPath('fx-json-formatter'));
    const tags = headTags(meta, PORTAL_ORIGIN);
    expect(content(tags, 'og:title')).toContain(tool!.name);
    expect(content(tags, 'og:description')).toBe(tool!.summary);
    expect(content(tags, 'og:image')).toBe(sharedImage);
  });

  it('F015_AC2 a linked tool’s portal address declares the same kind of preview as an embedded one', () => {
    const tool = registry.toolById('fx-linked')!;
    expect(tool.openMode).toBe('linked');
    expect(metaFor({ page: 'tool', id: tool.id }, registry)).toEqual({
      title: t('COPY-meta.toolTitle', { tool: tool.name }),
      description: tool.summary,
      path: toolPath(tool.id),
    });
  });

  it('F015_AC4 a hidden tool’s portal address declares the not-found title and not the tool’s name', () => {
    const hidden = registry.allTools.find((tool) => tool.id === 'fx-hidden')!;
    expect(hidden.hidden).toBe(true);
    const meta = metaFor({ page: 'tool', id: hidden.id }, registry);
    expect(meta.title).toBe(t('COPY-notFound.title'));
    expect(meta.noindex).toBe(true);
    const text = JSON.stringify(headTags(meta, PORTAL_ORIGIN));
    expect(text).not.toContain(hidden.name);
    expect(text).not.toContain(hidden.summary);
    expect(text).not.toContain(hidden.id);
  });

  it('F-015.R4 an unknown tool and the not-found page declare the not-found title, noindex and no address', () => {
    const notFound = metaFor({ page: 'notFound' }, registry);
    expect(metaFor({ page: 'tool', id: 'no-such-tool' }, registry)).toEqual(notFound);
    expect(notFound).toEqual({
      title: t('COPY-notFound.title'),
      description: t('COPY-notFound.body'),
      path: '/404/',
      noindex: true,
    });
    const tags = headTags(notFound, PORTAL_ORIGIN);
    expect(content(tags, 'robots')).toBe('noindex');
    // The not-found page answers at any address, so it names none.
    expect(content(tags, 'og:url')).toBeUndefined();
    expect(linkHref(tags, 'canonical')).toBeUndefined();
    expect(content(tags, 'og:image')).toBe(sharedImage);
  });

  it('F015_AC5 the Media tools category declares its name in the title and its intro as the description', () => {
    const media = registry.categories.find((c) => c.id === 'media')!;
    expect(media.name).toBe('Media tools');
    const meta = metaFor({ page: 'category', id: 'media' }, registry);
    expect(meta.title).toContain('Media tools');
    expect(meta.title).toBe(t('COPY-meta.categoryTitle', { category: media.name }));
    expect(meta.description).toBe(media.intro);
    expect(meta.path).toBe('/tools/media/');
    expect(content(headTags(meta, PORTAL_ORIGIN), 'og:description')).toBe(media.intro);
  });

  it('F-015.R5 RULE-06 an empty category gets the not-found preview', () => {
    // Converters holds only a hidden tool in this fixture.
    expect(registry.categories.find((c) => c.id === 'converters')).toBeUndefined();
    expect(metaFor({ page: 'category', id: 'converters' }, registry)).toEqual(metaFor({ page: 'notFound' }, registry));
  });

  it('NFR-12 the build fails on a title over 60 or a description over 160 characters, naming the page', () => {
    const ok = { title: 'x'.repeat(60), description: 'y'.repeat(160), path: '/tools/media/' };
    expect(() => headTags(ok, PORTAL_ORIGIN)).not.toThrow();
    expect(() => headTags({ ...ok, title: 'x'.repeat(61) }, PORTAL_ORIGIN)).toThrow(
      /NFR-12: \/tools\/media\/ title is 61 characters \(at most 60\)/,
    );
    expect(() => headTags({ ...ok, description: 'y'.repeat(161) }, PORTAL_ORIGIN)).toThrow(
      /NFR-12: \/tools\/media\/ description is 161 characters \(at most 160\)/,
    );
  });

  it('NFR-12 every page of the fixture content fits the title and description limits', () => {
    const routes = [
      ...(['home', 'tools', 'about', 'now', 'settings', 'notFound'] as const).map((page) => ({ page })),
      ...registry.categories.map((c) => ({ page: 'category' as const, id: c.id })),
      ...registry.visibleTools.map((tool) => ({ page: 'tool' as const, id: tool.id })),
    ];
    for (const route of routes) expect(() => headTags(metaFor(route, registry), PORTAL_ORIGIN)).not.toThrow();
  });
});

describe('F-015 site index', () => {
  const xml = siteIndexXml(registry);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

  it('F015_AC3 leaves out the hidden tool, and every listed tool entry is a portal address', () => {
    const hidden = registry.allTools.filter((tool) => tool.hidden);
    expect(hidden.map((tool) => tool.id)).toContain('fx-hidden');
    for (const tool of hidden) {
      expect(xml).not.toContain(tool.id);
      expect(xml).not.toContain(tool.url);
    }
    const toolLocs = locs.filter((loc) => loc.startsWith(`${PORTAL_ORIGIN}/t/`));
    expect(toolLocs.sort()).toEqual(registry.visibleTools.map((tool) => `${PORTAL_ORIGIN}${toolPath(tool.id)}`).sort());
    // No tool's own address is listed: only the portal's.
    for (const loc of locs) expect(loc.startsWith(`${PORTAL_ORIGIN}/`)).toBe(true);
  });

  it('F-015.R3 lists the public pages and visible category pages, not settings or empty categories', () => {
    for (const path of ['/', '/tools/', '/about/', '/now/']) expect(locs).toContain(`${PORTAL_ORIGIN}${path}`);
    expect(locs).not.toContain(`${PORTAL_ORIGIN}/projects/`);
    for (const c of registry.categories) expect(locs).toContain(`${PORTAL_ORIGIN}/tools/${c.id}/`);
    expect(locs).not.toContain(`${PORTAL_ORIGIN}/tools/converters/`);
    expect(locs).not.toContain(`${PORTAL_ORIGIN}/settings/`);
    expect(
      xml.startsWith(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ),
    ).toBe(true);
  });

  it('F-015.R3 robots.txt points crawlers at the site index', () => {
    expect(robotsTxt(PORTAL_ORIGIN)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${PORTAL_ORIGIN}/sitemap.xml\n`);
  });
});

describe('F-015 shared preview image', () => {
  const word = (width: number) => ({ d: 'M0 0h1v1z', width });
  const runs: GlyphRuns = {
    mark: { words: [word(20)], space: 10, ascent: 30, descent: 8 },
    brand: { words: [word(150)], space: 10, ascent: 30, descent: 8 },
    lead: { words: Array.from({ length: 12 }, () => word(180)), space: 14, ascent: 50, descent: 14 },
    host: { words: [word(140)], space: 10, ascent: 20, descent: 6 },
  };

  it('NFR-12 is 1200 × 630, drawn from the theme tokens, with the lead wrapped inside the margins', () => {
    expect(PREVIEW_IMAGE).toMatchObject({ path: '/preview.png', width: 1200, height: 630, type: 'image/png' });
    const svg = previewSvg(runs);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="1200" height="630"/);
    expect(svg).toContain('#0F0B16'); // color-bg (dark)
    expect(svg).toContain('#A47BFF'); // color-accent (dark)
    // 12 words of 180 px with 14 px spaces fit five per 1040 px line: three lines.
    expect(svg.match(/data-line=/g)).toHaveLength(3);
    for (const m of svg.matchAll(/data-line="\d+" transform="translate\((\d+(?:\.\d+)?) /g))
      expect(Number(m[1])).toBeGreaterThanOrEqual(80);
  });
});
