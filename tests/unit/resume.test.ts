// F-017 Read the Owner's résumé (SCR-Resume): MOD-Content's optional résumé (ENT-Resume, INV-08, F-017.R5), the
// SCR-Resume view and body (MOD-Pages) rendered through Astro's container API, and the links to it from navigation
// (CMP-AppShell), About, the palette's Pages group, the link preview and the site index. Each fixture under
// tests/fixtures/content/F017* overlays the valid base content, which itself has no résumé.
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import {
  ContentErrors,
  hasResumeEntries,
  loadRegistry,
  RESUME_SECTIONS,
  resumePeriodErrors,
  sitemapEntries,
  type Registry,
} from '../../src/modules/content/index.ts';
import { headTags, metaFor, PREVIEW_IMAGE, siteIndexXml } from '../../src/modules/meta/index.ts';
import About from '../../src/modules/pages/About.astro';
import { period, resumeView, skillMarks } from '../../src/modules/pages/resume/resume.ts';
import ResumeView from '../../src/modules/pages/resume/ResumeView.astro';
import { emptyQueryGroups, paletteIndex } from '../../src/modules/palette/logic.ts';
import { palettePages, paletteText } from '../../src/modules/palette/text.ts';
import { emptyDocument } from '../../src/modules/personal-data/index.ts';
import AppShell from '../../src/modules/shell/AppShell.astro';

const root = join(import.meta.dirname, '../..');
const fixtures = join(root, 'tests/fixtures/content');
const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** The valid base content plus an F-017 overlay (or none: the base has no résumé). */
function load(overlay?: string): Registry {
  const dir = mkdtempSync(join(tmpdir(), 'tarokit-resume-'));
  tmpDirs.push(dir);
  const contentDir = join(dir, 'content');
  cpSync(join(fixtures, 'valid'), contentDir, { recursive: true });
  if (overlay) cpSync(join(fixtures, overlay), contentDir, { recursive: true });
  return loadRegistry({ root, contentDir });
}
/** The formatted error lines of an overlay that must fail validation. */
function failures(overlay: string): string[] {
  try {
    load(overlay);
  } catch (e) {
    if (e instanceof ContentErrors) return e.errors.map((x) => `${x.file} › ${x.entryId} › ${x.rule}: ${x.message}`);
    throw e;
  }
  throw new Error(`${overlay}: expected the content to fail validation`);
}

async function render(component: Parameters<AstroContainer['renderToString']>[0], props: Record<string, unknown>) {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: preact, name: '@astrojs/preact' });
  return container.renderToString(component, { props });
}
const renderResume = (reg: Registry) => render(ResumeView, { view: resumeView(reg.resume!) });
/** Text content of the HTML, tags removed and whitespace collapsed. */
const text = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const headings = (html: string, level: number) =>
  [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'g'))].map((m) => text(m[1]!));
/** The `<li>` of a list whose markup contains `needle`. */
const itemWith = (html: string, needle: string) =>
  [...html.matchAll(/<li\b[^>]*>(?:(?!<li\b)[\s\S])*?<\/li>/g)].map((m) => m[0]).find((li) => li.includes(needle));

const full = load('F017-resume');
const base = load();

describe('ENT-Resume: the optional résumé (MOD-Content)', () => {
  test('ENT-Resume without resume.yaml there is no résumé', () => {
    expect(base.resume).toBeUndefined();
  });

  test('ENT-Resume a résumé with no entries in any section counts as no résumé', () => {
    expect(load('F017_AC8-empty-resume').resume).toBeUndefined();
    expect(hasResumeEntries({})).toBe(false);
    expect(hasResumeEntries({ skills: [], awards: [] })).toBe(false);
    expect(hasResumeEntries({ skills: [{ name: 'PHP' }] })).toBe(true);
  });

  test('ENT-Resume entries keep the order the Owner wrote them in', () => {
    expect(full.resume?.experience?.map((e) => e.role)).toEqual(['Mentor', 'Fixture engineer B']);
  });
});

describe('INV-08 a résumé period ends on or after it starts', () => {
  test('INV-08 an end before the start breaks it; the same month, a later month and no end do not', () => {
    const entry = (start: string, end?: string) => ({ role: 'r', organization: 'o', summary: 's', start, end });
    expect(
      resumePeriodErrors({
        experience: [entry('2020-03', '2020-03'), entry('2020-03'), entry('2021-03', '2020-01')],
        education: [{ program: 'p', institution: 'i', start: '2014-09', end: '2014-08' }],
      }),
    ).toEqual([
      { section: 'experience', index: 2, start: '2021-03', end: '2020-01' },
      { section: 'education', index: 0, start: '2014-09', end: '2014-08' },
    ]);
  });

  test('INV-08 an end month later than today is allowed (a planned end date)', () => {
    expect(resumePeriodErrors({ experience: [{ start: '2024-01', end: '2099-12' }] })).toEqual([]);
  });

  test('F017_AC9 a third experience entry ending before its start fails the build, naming the file, "experience 3" and INV-08', () => {
    expect(failures('F017_AC9-end-before-start')).toEqual([
      'content/resume.yaml › experience 3 › INV-08: end 2020-01 is before start 2021-03',
    ]);
  });

  test('F017_AC9 the error carries the line of the end month', () => {
    try {
      load('F017_AC9-end-before-start');
    } catch (e) {
      expect((e as ContentErrors).message).toMatch(
        /content\/resume\.yaml:\d+ › experience 3 › INV-08: end 2020-01 is before start 2021-03/,
      );
      return;
    }
    throw new Error('expected a failure');
  });
});

describe('F-017.R5 schema errors name the résumé entry by section and position', () => {
  test('F017_AC10 an unknown field in the first education entry fails the build, naming the file, "education 1" and the schema rule', () => {
    expect(failures('F017_AC10-unknown-field')).toEqual([
      'content/resume.yaml › education 1 › SCHEMA: unknown field "school"',
    ]);
  });
});

describe('RULE-15 résumé display', () => {
  test('RULE-15 sections appear in the order experience, education, skills, languages, certificates, awards', () => {
    expect(RESUME_SECTIONS).toEqual(['experience', 'education', 'skills', 'languages', 'certificates', 'awards']);
    expect(resumeView(full.resume!).sections).toEqual([...RESUME_SECTIONS]);
  });

  test('RULE-15 a period is the full English month and year, with "present" when there is no end', () => {
    expect(period('2022-06').text).toBe('June 2022 – present');
    expect(period('2011-09', '2014-09').text).toBe('September 2011 – September 2014');
    expect(period('2022-06').current).toBe(true);
    expect(period('2011-09', '2014-09').parts).toEqual([
      { text: 'September 2011', datetime: '2011-09' },
      { text: ' – ' },
      { text: 'September 2014', datetime: '2014-09' },
    ]);
  });

  test('RULE-15 a skill level is 5 marks with that many filled', () => {
    expect(skillMarks(3)).toEqual([true, true, true, false, false]);
    expect(skillMarks(5)).toEqual([true, true, true, true, true]);
    expect(skillMarks(1)).toEqual([true, false, false, false, false]);
  });
});

describe('F-017 Résumé page body (SCR-Resume)', () => {
  test('F017_AC1 experience, education and skills only: those three sections, in that order, and no other', async () => {
    const html = await renderResume(load('F017_AC1-no-languages'));
    expect(headings(html, 1)).toEqual(['My résumé']);
    expect(headings(html, 2)).toEqual(['Experience', 'Education', 'Skills']);
    expect(html).toContain('The long version: where I&#39;ve worked');
  });

  test('F017_AC2 experience entries A then B are shown A before B', async () => {
    const html = await renderResume(full);
    expect(html.indexOf('Mentor')).toBeGreaterThan(-1);
    expect(html.indexOf('Mentor')).toBeLessThan(html.indexOf('Fixture engineer B'));
  });

  test('F017_AC3 a current experience shows its role, organization, "June 2022 – present", summary and both highlights', async () => {
    const html = await renderResume(full);
    // The timeline entry: from its <li> to the next entry's heading (its highlights are a nested list).
    const heading = html.indexOf('>Mentor</h3>');
    const entry = html.slice(html.lastIndexOf('<li', heading), html.indexOf('<h3', heading + 1));
    const shown = text(entry);
    expect(shown).toContain('Mentor');
    expect(shown).toContain('Rising Stars');
    expect(shown).toContain('June 2022 – present');
    expect(entry).toContain('<time datetime="2022-06"');
    // The summary keeps its paragraph breaks (F-017 edge case).
    expect(entry).toMatch(
      /<p[^>]*>Fixture summary, first paragraph\.<\/p>\s*<p[^>]*>Fixture summary, second paragraph\.<\/p>/,
    );
    expect(shown).toContain('Fixture highlight one.');
    expect(shown).toContain('Fixture highlight two.');
    expect(entry).toMatch(/<h3[^>]*>Mentor<\/h3>/);
  });

  test('F017_AC4 an education entry shows its program, institution, "College" and "September 2011 – September 2014"', async () => {
    const html = await renderResume(full);
    const entry = itemWith(html, 'Information Technology')!;
    const shown = text(entry);
    for (const s of ['Information Technology', 'Fixture College', 'September 2011 – September 2014', 'Fixture notes.'])
      expect(shown).toContain(s);
    // The level is its own element, not the "College" inside the institution's name.
    expect(entry).toMatch(/<span class="level"[^>]*>College<\/span>/);
    expect(entry).toContain('<time datetime="2011-09"');
    expect(entry).toContain('<time datetime="2014-09"');
  });

  test('F017_AC5 PHP at level 5 shows five filled marks read as "5 out of 5"; Docker shows its name only', async () => {
    const html = await renderResume(full);
    const php = itemWith(html, '>PHP<')!;
    expect(php.match(/class="mark"[^>]*data-filled/g)).toHaveLength(5);
    expect(php).toMatch(/<span class="marks"[^>]*aria-hidden="true"/);
    expect(php).toMatch(/<span class="tk-visually-hidden"[^>]*>5 out of 5<\/span>/);
    const docker = itemWith(html, '>Docker<')!;
    expect(text(docker)).toBe('Docker');
    expect(docker).not.toContain('marks');
    // A level below 5 fills that many of the 5 marks.
    const python = itemWith(html, '>Python<')!;
    expect(python.match(/class="mark"/g)).toHaveLength(5);
    expect(python.match(/data-filled/g)).toHaveLength(3);
    expect(text(python)).toBe('Python 3 out of 5');
  });

  test('F017_AC6 a language with its level, a certificate and an award with their issuer and year', async () => {
    const html = await renderResume(full);
    expect(text(itemWith(html, '>English<')!)).toBe('English Advanced');
    expect(text(itemWith(html, '>Mindfulness<')!)).toBe('Mindfulness Est Rouge 2021');
    expect(text(itemWith(html, '>Employee of the Year<')!)).toBe('Employee of the Year Green Global 2017');
    expect(headings(html, 2)).toEqual(['Experience', 'Education', 'Skills', 'Languages', 'Certificates', 'Awards']);
  });

  test('SCR-Resume each section is a region headed by its h2', async () => {
    const html = await renderResume(full);
    for (const s of RESUME_SECTIONS)
      expect(html).toMatch(new RegExp(`<section aria-labelledby="resume-${s}"[\\s\\S]*?<h2 id="resume-${s}"`));
  });
});

describe('F-017.R4 links to the Résumé page', () => {
  const navLabels = (html: string) =>
    [...html.matchAll(/<ul id="main-menu"[\s\S]*?<\/ul>/g)]
      .flatMap((m) => [...m[0].matchAll(/<a href="([^"]+)"/g)])
      .map((m) => m[1]);

  test('F017_AC7 with a résumé, navigation includes Résumé between About and Now, and the About page links to it', async () => {
    const shell = await render(AppShell, { path: '/', resume: true });
    expect(navLabels(shell)).toEqual(['/', '/tools/', '/about/', '/resume/', '/now/', '/settings/']);
    expect(shell).toContain('>Résumé</a>');
    const current = await render(AppShell, { path: '/resume/', resume: true });
    expect(current).toMatch(/<a href="\/resume\/" aria-current="page">Résumé<\/a>/);
    const about = await render(About, { profile: full.profile, resume: true });
    expect(about).toMatch(
      /<a class="resume"[^>]*href="\/resume\/"[^>]*>[\s\S]*?Want the long version\? Here&#39;s my résumé\./,
    );
  });

  test("F017_AC7 with a résumé, the palette's empty-query Pages group includes Résumé", () => {
    const pages = paletteText(full).pages;
    expect(pages.map((p) => p.name)).toEqual(['Home', 'Tools', 'About me', 'Résumé', 'Now', 'Settings']);
    expect(pages.find((p) => p.id === 'resume')?.path).toBe('/resume/');
    const index = paletteIndex({ tools: [] }, pages, {
      theme: 'Theme',
      export: 'Export',
      copy: 'Copy',
    });
    const groups = emptyQueryGroups(index, emptyDocument());
    expect(groups.find((g) => g.id === 'pages')?.items.map((i) => i.name)).toContain('Résumé');
  });

  for (const [label, overlay] of [
    ['without a résumé', undefined],
    ['with a résumé that has no entries', 'F017_AC8-empty-resume'],
  ] as const)
    test(`F017_AC8 ${label}: no navigation item, no palette page, no About link and no site-index entry`, async () => {
      const reg = load(overlay);
      expect(reg.resume).toBeUndefined();
      const shell = await render(AppShell, { path: '/', resume: !!reg.resume });
      expect(shell).not.toContain('/resume/');
      expect(shell).not.toContain('Résumé');
      const about = await render(About, { profile: reg.profile, resume: !!reg.resume });
      expect(about).not.toContain('/resume/');
      expect(about).not.toContain('Want the long version');
      expect(paletteText(reg).pages.map((p) => p.id)).toEqual(['home', 'tools', 'about', 'now', 'settings']);
      expect(palettePages(false).map((p) => p.id)).not.toContain('resume');
      expect(sitemapEntries(reg)).not.toContain('/resume/');
      expect(siteIndexXml(reg)).not.toContain('/resume/');
    });
});

describe('F-017.R6 link preview and site index', () => {
  test('F017_AC11 the Résumé page declares COPY-meta.resumeTitle, COPY-meta.resumeDescription and the shared image; the site index lists /resume/', () => {
    const meta = metaFor({ page: 'resume' }, full);
    expect(meta).toEqual({
      title: 'Résumé — TaroKit',
      description: "Where I've worked, what I studied, and what I'm good at.",
      path: '/resume/',
    });
    const tags = headTags(meta, 'https://tarokit.app');
    const content = (key: string) => tags.find((t) => t.attrs.property === key || t.attrs.name === key)?.attrs.content;
    expect(content('og:title')).toBe('Résumé — TaroKit');
    expect(content('og:description')).toBe(meta.description);
    expect(content('og:image')).toBe(`https://tarokit.app${PREVIEW_IMAGE.path}`);
    expect(content('og:url')).toBe('https://tarokit.app/resume/');
    expect(sitemapEntries(full).slice(0, 5)).toEqual(['/', '/tools/', '/about/', '/resume/', '/now/']);
    expect(siteIndexXml(full)).toContain(`<loc>${full.portalOrigin}/resume/</loc>`);
  });
});
