// F-008 About the Owner (SCR-About): MOD-Content's profile derivations, the avatar asset check, and the About
// content (MOD-Pages) rendered through Astro's container API from fixture profiles.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  avatarPlugin,
  avatarSource,
  ContentErrors,
  initials,
  loadRegistry,
  paragraphs,
  profileLinks,
  type Registry,
} from '../../src/modules/content/index.ts';
import About from '../../src/modules/pages/About.astro';

const root = join(import.meta.dirname, '../..');
const fixture = (name: string) => loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content', name) });
const full = fixture('F008_AC1-full-profile');
const noAvatar = fixture('F008_AC2-no-avatar');
const avatar = { src: '/_astro/avatar.hash.webp', width: 720, height: 720 };

async function render(reg: Registry, withAvatar = false) {
  const container = await AstroContainer.create();
  return container.renderToString(About, { props: { profile: reg.profile, avatar: withAvatar ? avatar : undefined } });
}
/** The <a> element (opening tag to closing tag) whose markup contains `text`. */
const linkWith = (html: string, text: string) =>
  [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]).find((a) => a.includes(text));

describe('F-008 profile derivations (MOD-Content)', () => {
  test('F008_AC2 the initials of "Taro Example" are "TE"', () => {
    expect(initials('Taro Example')).toBe('TE');
    expect(initials('  nguyen tri   thanh ')).toBe('NTT');
  });

  test('F008_AC1 edge: a bio with paragraphs keeps its paragraph breaks', () => {
    expect(paragraphs(full.profile.bio)).toEqual([
      'Fixture bio, first paragraph.',
      'Fixture bio, second paragraph\nthat wraps onto a second line.',
    ]);
    expect(paragraphs('One.')).toEqual(['One.']);
  });

  test('F008_AC3 F008_AC4 web links open in a new tab; email links start a message', () => {
    expect(profileLinks(full.profile.links)).toEqual([
      {
        label: 'Code',
        href: 'https://github.com/fixture-owner',
        kind: 'code',
        newTab: true,
        detail: 'github.com/fixture-owner',
      },
      {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/fixture-owner/',
        kind: 'social',
        newTab: true,
        detail: 'linkedin.com/in/fixture-owner',
      },
      { label: 'Email', href: 'mailto:owner@example.com', kind: 'email', newTab: false, detail: 'owner@example.com' },
    ]);
    // Without a kind, a mailto: address is still an email link; anything else is "other".
    expect(profileLinks([{ label: 'Mail', url: 'mailto:a@b.co' }])[0]).toMatchObject({ kind: 'email', newTab: false });
    expect(profileLinks([{ label: 'Site', url: 'https://example.com/' }])[0]).toMatchObject({
      kind: 'other',
      newTab: true,
      detail: 'example.com',
    });
  });

  test('ADR-0005 a profile avatar that is not in content/assets/ fails the build and names the file', () => {
    expect(() => loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F008-missing-avatar') })).toThrow(
      ContentErrors,
    );
    try {
      loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F008-missing-avatar') });
    } catch (e) {
      expect((e as Error).message).toContain('profile.yaml');
      expect((e as Error).message).toContain('avatar "missing.png" not found in content/assets/');
    }
  });
});

describe('virtual:tarokit/avatar (MOD-Content)', () => {
  test('serves the avatar import, or null without one', () => {
    expect(avatarSource('/c/assets/me.png')).toBe('export { default } from "/c/assets/me.png";\n');
    expect(avatarSource(undefined)).toBe('export default null;\n');
  });

  test('in dev, only edits inside the content folder rebuild the module', () => {
    const contentDir = join(root, 'content');
    const handlers: ((path: string) => void)[] = [];
    let invalidated = 0;
    avatarPlugin({ file: () => undefined, contentDir }).configureServer({
      watcher: { add: () => undefined, on: (_e: string, cb: (path: string) => void) => handlers.push(cb) },
      moduleGraph: { getModuleById: () => ({}), invalidateModule: () => void invalidated++ },
      ws: { send: () => undefined },
    });
    const edit = (path: string) => handlers.forEach((h) => h(path));
    edit(`${contentDir}-old/profile.yaml`);
    expect(invalidated).toBe(0);
    edit(join(contentDir, 'profile.yaml'));
    expect(invalidated).toBe(3); // one handler per watcher event, each invalidating once
  });
});

describe('F-008 About content (SCR-About)', () => {
  test('F008_AC1 shows the avatar, full name, nickname, headline, bio and location', async () => {
    const html = await render(full, true);
    expect(html).toMatch(/<img[^>]*src="\/_astro\/avatar\.hash\.webp"[^>]*alt="Portrait of Nguyen Tri Thanh"/);
    expect(html).toMatch(/<h1[^>]*>Nguyen Tri Thanh<\/h1>/);
    expect(html).toContain('aka Taro');
    expect(html).toContain('Fixture headline. I build small tools.');
    expect(html).toMatch(/<p[^>]*>Fixture bio, first paragraph.<\/p>/);
    expect(html).toContain('Da Nang, Vietnam');
    expect(html).not.toContain('data-initials');
  });

  test('F008_AC1 edge: each bio paragraph is its own paragraph', async () => {
    const html = await render(full, true);
    expect(html.match(/<p[^>]*>Fixture bio,/g)).toHaveLength(2);
  });

  test('F008_AC2 without an avatar, the initials "TE" stand in, named for the person', async () => {
    const html = await render(noAvatar);
    expect(html).toMatch(
      /<span[^>]*role="img"[^>]*aria-label="Portrait of Taro Example"[^>]*data-initials[^>]*>TE<\/span>/,
    );
    expect(html).not.toContain('<img');
    // No nickname and no location set: neither line is shown.
    expect(html).not.toContain('aka ');
    expect(html).not.toContain('class="location"');
  });

  test('F008_AC3 the "Code" link opens in a new tab and says so', async () => {
    const a = linkWith(await render(full, true), '>Code<');
    expect(a).toContain('href="https://github.com/fixture-owner"');
    expect(a).toContain('target="_blank"');
    expect(a).toContain('rel="noopener noreferrer"');
    expect(a).toContain('Opens in a new tab');
  });

  test('F008_AC4 the email link starts a new message to that address, in the same tab', async () => {
    const html = await render(full, true);
    const a = linkWith(html, '>Email<');
    expect(a).toContain('href="mailto:owner@example.com"');
    expect(a).not.toContain('target=');
    expect(a).not.toContain('Opens in a new tab');
    expect(html).toMatch(/<h2[^>]*>Find me<\/h2>/);
  });

  test('F008_AC5 links to Projects and Now are shown with COPY-about.more', async () => {
    const html = await render(noAvatar);
    expect(html).toContain('See what I&#39;ve built and what I&#39;m up to now.');
    expect(linkWith(html, '>Projects<')).toContain('href="/projects/"');
    expect(linkWith(html, '>Now<')).toContain('href="/now/"');
  });
});
