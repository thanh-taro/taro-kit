// F-018 Read the privacy policy and terms: MOD-Content (the two required policies, their body format and INV-02),
// MOD-Pages (policyView, PolicyView.astro), MOD-Meta (previews, site index) and MOD-Shell (the footer).
// Failing fixtures overlay the valid base content (tests/fixtures/content/valid), as in content-validation.test.ts;
// F018_AC5-missing-terms is a whole content set without terms.yaml.
import preact from '@astrojs/preact/server.js';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ContentErrors,
  loadRegistry,
  PORTAL_ORIGIN,
  policyBlocks,
  policyLinkErrors,
  PRIVACY_PATH,
  sitemapEntries,
  TERMS_PATH,
  type Policy,
  type Registry,
} from '../../src/modules/content/index.ts';
import { t, tBoth } from '../../src/modules/copy/index.ts';
import { headTags, metaFor, PREVIEW_IMAGE, siteIndexXml, type HeadTag } from '../../src/modules/meta/index.ts';
import { policyView } from '../../src/modules/pages/policy/policy.ts';
import PolicyView from '../../src/modules/pages/policy/PolicyView.astro';
import AppShellFooter from '../../src/modules/shell/AppShellFooter.astro';
import { showing } from './lang-html.ts';

const root = join(import.meta.dirname, '../..');
const fixtures = join(root, 'tests/fixtures/content');
const tmpDirs: string[] = [];

/** Copies a content set into a folder named `content` (so errors read `content/…`), optionally with an overlay. */
function contentFrom(base: string, overlay?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-policy-'));
  tmpDirs.push(dir);
  const contentDir = join(dir, 'content');
  cpSync(join(fixtures, base), contentDir, { recursive: true });
  if (overlay) cpSync(join(fixtures, overlay), contentDir, { recursive: true });
  return contentDir;
}
const load = (overlay?: string): Registry => loadRegistry({ root, contentDir: contentFrom('valid', overlay) });

/** The formatted error lines of content that must fail. */
function failures(base: string, overlay?: string): string[] {
  try {
    loadRegistry({ root, contentDir: contentFrom(base, overlay) });
  } catch (e) {
    if (e instanceof ContentErrors)
      return e.message
        .split('\n')
        .slice(1)
        .map((l) => l.trim());
    throw e;
  }
  throw new Error(`${overlay ?? base}: expected the content to fail validation`);
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

async function render(
  component: Parameters<AstroContainer['renderToString']>[0],
  props = {},
  lang: 'en-US' | 'vi-VN' = 'en-US',
) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return showing(await container.renderToString(component, { props }), lang);
}

/**
 * A policy file as YAML, every text the same in both languages (INV-09): the title, then each section's heading and
 * literal body. The en-US body starts on the line after its `en-US: |`, the vi-VN one likewise.
 */
function policyYaml(title: string, sections: { heading: string; body: string }[], updated = '2026-10-22'): string {
  const both = (v: string) => `\n      en-US: ${v}\n      vi-VN: ${v}`;
  const body = (b: string) =>
    b
      .replace(/\n$/, '')
      .split('\n')
      .map((l) => (l ? `        ${l}` : ''))
      .join('\n');
  return (
    `title:\n  en-US: ${title}\n  vi-VN: ${title}\nupdated: ${updated}\n` +
    (sections.length
      ? 'sections:\n' +
        sections
          .map(
            (sec) =>
              `  - heading:${both(sec.heading).replace(/\n {6}/g, '\n      ')}\n    body:\n      en-US: |\n${body(sec.body)}\n      vi-VN: |\n${body(sec.body)}\n`,
          )
          .join('')
      : '')
  );
}

const count = (html: string, re: RegExp) => [...html.matchAll(re)].length;
/** Text with tags removed and whitespace collapsed. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('F-018 policies as content (MOD-Content)', () => {
  it('loads both policies, with section bodies parsed into paragraphs, lists and links', () => {
    const r = load();
    expect(r.privacy.title['en-US']).toBe('Privacy');
    expect(r.privacy.updated).toBe('2026-10-22');
    expect(r.privacy.sections.map((s) => s.heading['en-US'])).toEqual([
      'Sample section with a list',
      'Sample section with links',
    ]);
    expect(r.terms.title['en-US']).toBe('Terms');
    expect(r.terms.sections).toHaveLength(3);
    for (const lang of ['en-US', 'vi-VN'] as const)
      expect(r.privacy.sections[0]!.blocks[lang].map((b) => b.kind)).toEqual(['paragraph', 'list', 'paragraph']);
  });

  it('F018_AC5 fails when content/terms.yaml is missing, naming it as missing', () => {
    // The valid base without its terms.yaml (no committed copy of the base, so it never drifts from it).
    const dir = contentFrom('valid');
    rmSync(join(dir, 'terms.yaml'));
    expect(() => loadRegistry({ root, contentDir: dir })).toThrow(ContentErrors);
    try {
      loadRegistry({ root, contentDir: dir });
    } catch (e) {
      expect(
        (e as ContentErrors).message
          .split('\n')
          .slice(1)
          .map((l) => l.trim()),
      ).toEqual(['content/terms.yaml › - › SCHEMA: file is missing']);
    }
  });

  it('F018_AC6 fails on an updated date that is not a date, naming the file, the updated field and the value', () => {
    expect(failures('valid', 'F018_AC6-bad-updated')).toEqual([
      'content/privacy.yaml:5 › - › SCHEMA: updated "2026-13-01" is not a valid date',
    ]);
  });

  it('F018_AC9 fails on an http link in a terms paragraph, naming the file, the section and INV-02', () => {
    expect(failures('valid', 'F018_AC9-http-link')).toEqual([
      'content/terms.yaml:22 › section 2 › INV-02: link "http://example.com" is not https (en-US)',
      'content/terms.yaml:26 › section 2 › INV-02: link "http://example.com" is not https (vi-VN)',
    ]);
  });

  it('F018_AC9 a link wrapped over two lines is checked as the page shows it: an http address fails', () => {
    const dir = contentFrom('valid');
    writeFileSync(
      join(dir, 'terms.yaml'),
      policyYaml('Terms', [{ heading: 'A', body: 'Fine.\n\nSee [the example\nsite](http://example.com) for more.\n' }]),
    );
    expect(() => loadRegistry({ root, contentDir: dir })).toThrow(
      /content\/terms\.yaml:13 › section 1 › INV-02: link "http:\/\/example\.com" is not https \(en-US\)/,
    );
  });

  it('F-018.R1 a secure link wrapped over two lines shows as one link', () => {
    expect(policyBlocks('See [the example\nsite](https://example.com/) for more.\n')).toEqual([
      {
        kind: 'paragraph',
        parts: [
          { kind: 'text', text: 'See ' },
          { kind: 'link', text: 'the example site', href: 'https://example.com/', newTab: true },
          { kind: 'text', text: ' for more.' },
        ],
      },
    ]);
  });

  it('F018_AC10 fails on terms with no sections, naming the file and the missing sections', () => {
    const lines = failures('valid', 'F018_AC10-no-sections');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^content\/terms\.yaml:6 › - › SCHEMA: sections must NOT have fewer than 1 items$/);
  });

  it('F018_AC10 fails on terms without a sections field, naming the file and the missing field', () => {
    const dir = contentFrom('valid');
    writeFileSync(join(dir, 'terms.yaml'), policyYaml('Terms', []));
    expect(() => loadRegistry({ root, contentDir: dir })).toThrow(
      /content\/terms\.yaml:1 › - › SCHEMA: missing required field "sections"/,
    );
  });

  it('F-018.R5 a folded body (>) fails, naming the file and the section', () => {
    expect(failures('valid', 'F018-folded-body')).toEqual([
      'content/privacy.yaml:20 › section 2 › SCHEMA: body must be a literal block (|), so its line breaks are kept (en-US)',
      'content/privacy.yaml:24 › section 2 › SCHEMA: body must be a literal block (|), so its line breaks are kept (vi-VN)',
    ]);
  });

  it('F-018.R5 a paragraph that mixes list lines with other lines fails, naming the file and the section', () => {
    expect(failures('valid', 'F018-mixed-list')).toEqual([
      'content/terms.yaml:15 › section 1 › SCHEMA: paragraph 2 mixes list lines ("- ") with other lines; put a blank line before the list (en-US)',
      'content/terms.yaml:21 › section 1 › SCHEMA: paragraph 2 mixes list lines ("- ") with other lines; put a blank line before the list (vi-VN)',
    ]);
  });

  it('F-018.R5 a section that breaks the schema is named by its position, counting from 1', () => {
    const dir = contentFrom('valid');
    writeFileSync(
      join(dir, 'privacy.yaml'),
      policyYaml('Privacy', [
        { heading: 'Fine', body: 'Text.\n' },
        { heading: 'x'.repeat(81), body: 'Text.\n' },
      ]),
    );
    expect(() => loadRegistry({ root, contentDir: dir })).toThrow(
      /content\/privacy\.yaml:15 › section 2 › SCHEMA: heading\.en-US must NOT have more than 80 characters/,
    );
  });
});

describe('F-018 policy body format (policyBlocks, policyLinkErrors)', () => {
  it('F018_AC8 links keep their text and address; web links open in a new tab, email links do not', () => {
    const [block] = policyBlocks(
      'Read [its privacy policy](https://www.cloudflare.com/privacypolicy/) or email [me](mailto:adamnguyen.itdn@gmail.com).\n',
    );
    expect(block).toEqual({
      kind: 'paragraph',
      parts: [
        { kind: 'text', text: 'Read ' },
        { kind: 'link', text: 'its privacy policy', href: 'https://www.cloudflare.com/privacypolicy/', newTab: true },
        { kind: 'text', text: ' or email ' },
        { kind: 'link', text: 'me', href: 'mailto:adamnguyen.itdn@gmail.com', newTab: false },
        { kind: 'text', text: '.' },
      ],
    });
  });

  it('F018_AC8 a paragraph whose every line starts with "- " is a bulleted list, one item per line', () => {
    const blocks = policyBlocks('Lead-in:\n\n- one;\n- two with [a link](https://example.com/);\n- three.\n');
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({
      kind: 'list',
      items: [
        [{ kind: 'text', text: 'one;' }],
        [
          { kind: 'text', text: 'two with ' },
          { kind: 'link', text: 'a link', href: 'https://example.com/', newTab: true },
          { kind: 'text', text: ';' },
        ],
        [{ kind: 'text', text: 'three.' }],
      ],
    });
  });

  it('F-018.R1 paragraphs are separated by blank lines; a line break inside a paragraph joins with a space', () => {
    expect(policyBlocks('First line\nsame paragraph.\n\n\nSecond paragraph.\n')).toEqual([
      { kind: 'paragraph', parts: [{ kind: 'text', text: 'First line same paragraph.' }] },
      { kind: 'paragraph', parts: [{ kind: 'text', text: 'Second paragraph.' }] },
    ]);
  });

  it('F-018.R1 other bracket syntax stays literal text', () => {
    const body = 'A [note] here, [no address]() and "as is" (quoted).';
    expect(policyBlocks(body)).toEqual([{ kind: 'paragraph', parts: [{ kind: 'text', text: body }] }]);
  });

  it('F-018.R1 nested brackets: only the innermost [text](address) is the link', () => {
    expect(policyBlocks('Note [see [docs](https://x.com/) here]')).toEqual([
      {
        kind: 'paragraph',
        parts: [
          { kind: 'text', text: 'Note [see ' },
          { kind: 'link', text: 'docs', href: 'https://x.com/', newTab: true },
          { kind: 'text', text: ' here]' },
        ],
      },
    ]);
  });

  it('INV-02 text that looks like a link but has no readable https or email address is an error', () => {
    const errors = policyLinkErrors({
      sections: [
        { heading: 'A', body: { 'en-US': 'Run [run](javascript:alert(1)) now.\n' } },
        { heading: 'B', body: { 'en-US': 'See [x](http://a.com "t").\n' } },
        { heading: 'C', body: { 'en-US': 'Read [wiki](https://en.wikipedia.org/wiki/Foo_(bar)).\n' } },
        { heading: 'D', body: { 'en-US': 'Spaced [s](https://a b).\n' } },
      ],
    });
    expect(errors.map((e) => [e.index, e.line, e.kind, e.link])).toEqual([
      [0, 0, 'malformed', '[run](javascript:alert(1)'],
      [1, 0, 'malformed', '[x](http://a.com "t")'],
      [2, 0, 'malformed', '[wiki](https://en.wikipedia.org/wiki/Foo_(bar)'],
      [3, 0, 'malformed', '[s](https://a b)'],
    ]);
  });

  it('INV-02 a malformed link fails the build naming the file, the section and how to write the address', () => {
    const dir = contentFrom('valid');
    writeFileSync(
      join(dir, 'privacy.yaml'),
      policyYaml('Privacy', [
        { heading: 'A', body: 'Fine.\n' },
        { heading: 'B', body: 'Read [wiki](https://en.wikipedia.org/wiki/Foo_(bar)).\n' },
      ]),
    );
    expect(() => loadRegistry({ root, contentDir: dir })).toThrow(
      /content\/privacy\.yaml:19 › section 2 › INV-02: link "\[wiki\]\(https:\/\/en\.wikipedia\.org\/wiki\/Foo_\(bar\)" must be \[text\]\(address\) with an https or mailto address and no spaces; write \( and \) in an address as %28 and %29/,
    );
  });

  it('INV-02 a link whose address is not https or email is an error naming its section', () => {
    const errors = policyLinkErrors({
      sections: [
        { heading: 'A', body: { 'en-US': 'Fine [x](https://example.com/) and [y](mailto:a@b.c).\n' } },
        {
          heading: 'B',
          body: {
            'en-US': 'Fine.\n\n- [bad](http://example.com)\n- [worse](ftp://example.com/f)\n',
            'vi-VN': 'Ổn.\n\n- [tệ](http://example.com)\n',
          },
        },
        { heading: 'C', body: { 'vi-VN': 'Relative [z](/privacy/).\n' } },
      ],
    });
    expect(errors).toEqual([
      { index: 1, lang: 'en-US', line: 2, kind: 'insecure', link: 'http://example.com' },
      { index: 1, lang: 'en-US', line: 3, kind: 'insecure', link: 'ftp://example.com/f' },
      { index: 1, lang: 'vi-VN', line: 2, kind: 'insecure', link: 'http://example.com' },
      { index: 2, lang: 'vi-VN', line: 0, kind: 'insecure', link: '/privacy/' },
    ]);
  });
});

/** A parsed policy for the page tests: `n` sections with one paragraph each. */
const samplePolicy = (title: string, n: number): Policy => ({
  title: { 'en-US': title, 'vi-VN': `${title} (vi)` },
  updated: '2026-10-22',
  sections: Array.from({ length: n }, (_, i) => ({
    heading: { 'en-US': `Heading ${i + 1}`, 'vi-VN': `Tiêu đề ${i + 1}` },
    blocks: { 'en-US': policyBlocks(`Paragraph ${i + 1}.\n`), 'vi-VN': policyBlocks(`Đoạn ${i + 1}.\n`) },
  })),
});

describe('F-018 SCR-Policy (policyView, PolicyView.astro)', () => {
  it('F018_AC1 the title is the only h1, two sections are h2 with their paragraphs, and the full date is marked up', async () => {
    const view = policyView(samplePolicy('Privacy', 2));
    expect(view).toMatchObject({ updated: '2026-10-22' });
    expect(view.title['en-US']).toBe('Privacy');
    expect(view.updatedText['en-US']).toBe('October 22, 2026');
    const html = await render(PolicyView, { view });
    expect(count(html, /<h1[\s>]/g)).toBe(1);
    expect(html).toMatch(/<h1[^>]*>Privacy<\/h1>/);
    expect(count(html, /<h2[\s>]/g)).toBe(2);
    expect(html).toMatch(/<h2[^>]*>Heading 1<\/h2>\s*<div class="body"[^>]*>\s*<p[^>]*>Paragraph 1\.<\/p>/);
    expect(html).toMatch(/<h2[^>]*>Heading 2<\/h2>\s*<div class="body"[^>]*>\s*<p[^>]*>Paragraph 2\.<\/p>/);
    // F-019.R6: no translation note while English shows.
    expect(html).not.toContain('policy-translation-note');
    expect(html).toMatch(/<time[^>]*datetime="2026-10-22"[^>]*>October 22, 2026<\/time>/);
    expect(text(html)).toContain(t('COPY-policy.updated', { date: 'October 22, 2026' }));
  });

  it('F018_AC2 terms with three sections show the title, the headings, their paragraphs and the date', async () => {
    const html = await render(PolicyView, { view: policyView(samplePolicy('Terms', 3)) });
    expect(html).toMatch(/<h1[^>]*>Terms<\/h1>/);
    expect([...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1])).toEqual([
      'Heading 1',
      'Heading 2',
      'Heading 3',
    ]);
    for (let i = 1; i <= 3; i++) expect(html).toContain(`Paragraph ${i}.</p>`);
    expect(text(html)).toContain('Last updated October 22, 2026');
  });

  it('F019_AC10 with Vietnamese showing, the translation note follows the title; the page is in Vietnamese', async () => {
    const html = await render(PolicyView, { view: policyView(samplePolicy('Privacy', 2)) }, 'vi-VN');
    expect(html).toMatch(/<h1[^>]*>Privacy \(vi\)<\/h1>/);
    const note = /<div[^>]*data-testid="policy-translation-note"[^>]*>([\s\S]*?)<\/div>/.exec(html);
    expect(note).not.toBeNull();
    expect(note![0]).toContain('lang="vi-VN"');
    expect(text(note![1]!)).toBe(t('COPY-policy.translationNote', undefined, 'vi-VN'));
    expect(html.indexOf('policy-translation-note')).toBeGreaterThan(html.indexOf('</h1>'));
    expect(html.indexOf('policy-translation-note')).toBeLessThan(html.indexOf('<h2'));
    expect(html).toMatch(/<h2[^>]*>Tiêu đề 1<\/h2>/);
    expect(html).toContain('Đoạn 1.</p>');
    expect(text(html)).toContain('22 tháng 10, 2026');
    expect(html).not.toContain('Paragraph 1.');
  });

  it('F018_AC8 renders web links in a new tab, email links plainly, and a list as a list', async () => {
    const body = policyBlocks(
      'See [its privacy policy](https://www.cloudflare.com/privacypolicy/) or [email me](mailto:adamnguyen.itdn@gmail.com).\n\n- a\n- b\n- c\n',
    );
    const policy: Policy = {
      title: { 'en-US': 'Privacy', 'vi-VN': 'Quyền riêng tư' },
      updated: '2026-10-22',
      sections: [{ heading: { 'en-US': 'Links', 'vi-VN': 'Liên kết' }, blocks: { 'en-US': body, 'vi-VN': body } }],
    };
    const html = await render(PolicyView, { view: policyView(policy) });
    expect(html).toMatch(
      /<a href="https:\/\/www\.cloudflare\.com\/privacypolicy\/" target="_blank" rel="noopener noreferrer"[^>]*>its privacy policy<\/a>/,
    );
    const mail = /<a ([^>]*)>email me<\/a>/.exec(html);
    expect(mail?.[1]).toContain('href="mailto:adamnguyen.itdn@gmail.com"');
    expect(mail?.[1]).not.toContain('target=');
    expect(count(html, /<ul[\s>]/g)).toBe(1);
    expect(count(html, /<li[\s>]/g)).toBe(3);
  });
});

describe('F-018 link previews and site index (MOD-Meta)', () => {
  const r = load();
  const content = (tags: HeadTag[], key: string) =>
    tags.find((tag) => tag.attrs.property === key || tag.attrs.name === key)?.attrs.content;

  it('F018_AC4 the Privacy and Terms pages declare their title, description and the shared preview image', () => {
    const pages = [
      ['privacy', PRIVACY_PATH, 'COPY-meta.privacyTitle', 'COPY-meta.privacyDescription'],
      ['terms', TERMS_PATH, 'COPY-meta.termsTitle', 'COPY-meta.termsDescription'],
    ] as const;
    for (const [page, path, title, description] of pages) {
      const meta = metaFor({ page }, r);
      expect(meta).toEqual({ title: t(title), titles: tBoth(title), description: t(description), path });
      const tags = headTags(meta, PORTAL_ORIGIN);
      expect(content(tags, 'og:title')).toBe(t(title));
      expect(content(tags, 'og:description')).toBe(t(description));
      expect(content(tags, 'og:image')).toBe(`${PORTAL_ORIGIN}${PREVIEW_IMAGE.path}`);
      expect(content(tags, 'og:url')).toBe(`${PORTAL_ORIGIN}${path}`);
      expect(content(tags, 'robots')).toBeUndefined();
    }
    expect(PRIVACY_PATH).toBe('/privacy/');
    expect(TERMS_PATH).toBe('/terms/');
  });

  it('F018_AC4 the site index lists /privacy/ and /terms/, last of the public pages', () => {
    const entries = sitemapEntries(r);
    const pages = entries.filter((p) => !p.startsWith('/t/') && !/^\/tools\/[^/]+\/$/.test(p));
    expect(pages).toEqual(['/', '/tools/', '/about/', '/now/', '/privacy/', '/terms/']);
    const xml = siteIndexXml(r);
    expect(xml).toContain(`<loc>${PORTAL_ORIGIN}/privacy/</loc>`);
    expect(xml).toContain(`<loc>${PORTAL_ORIGIN}/terms/</loc>`);
  });
});

describe('F-018 CMP-AppShell footer (MOD-Shell)', () => {
  it('F-018.R3 links to Privacy and Terms, with no current page elsewhere', async () => {
    const html = await render(AppShellFooter, { path: '/' });
    expect(html).toMatch(/^<footer[\s>]/);
    expect(html).toMatch(/<a href="\/privacy\/"[^>]*>Privacy<\/a>/);
    expect(html).toMatch(/<a href="\/terms\/"[^>]*>Terms<\/a>/);
    expect(html).not.toContain('aria-current');
  });

  it('F-018.R3 marks the link to the page shown as the current page', async () => {
    const privacy = await render(AppShellFooter, { path: '/privacy/' });
    expect(privacy).toMatch(/<a href="\/privacy\/"[^>]*aria-current="page"[^>]*>Privacy<\/a>/);
    expect(privacy).not.toMatch(/<a href="\/terms\/"[^>]*aria-current/);
    const terms = await render(AppShellFooter, { path: '/terms/' });
    expect(terms).toMatch(/<a href="\/terms\/"[^>]*aria-current="page"[^>]*>Terms<\/a>/);
    expect(terms).not.toMatch(/<a href="\/privacy\/"[^>]*aria-current/);
  });
});
