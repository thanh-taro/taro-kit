// F-009 Showcase projects: MOD-Content's project order (R1, RULE-06) and image checks (R2), CMP-ProjectCard (R2),
// the SCR-Projects body (R1 to R3) rendered through Astro's container API, and the address-to-card mapping (R4).
// Content: the fixture build's content, tests/fixtures/content/F005-favorites (its projects/ are F-009's).
// Browser behavior (new tab on activation, the #<id> address) is verified in tests/e2e/projects.spec.ts.
import preact from '@astrojs/preact/server.js';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  assetFile,
  type ContentError,
  ContentErrors,
  IMAGE_TYPES,
  imageType,
  loadRegistry,
  projectPath,
  resolveAsset,
  visibleProjects,
} from '../../src/modules/content/index.ts';
import ProjectCard from '../../src/modules/design-system/ProjectCard.astro';
import { projectImagePath } from '../../src/modules/pages/projects/index.ts';
import { cardIdForHash } from '../../src/modules/pages/projects/project-anchor.ts';
import ProjectsView from '../../src/modules/pages/projects/ProjectsView.astro';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F005-favorites') });

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}) {
  const container = await AstroContainer.create();
  // CMP-StateMessage (the empty state) is a Preact component rendered without hydration.
  container.addServerRenderer({ name: '@astrojs/preact', renderer: preact });
  return container.renderToString(component, { props });
}

const project = (id: string, name: string, year: number, hidden = false) => ({ id, name, year, hidden });

describe('F-009 project order (MOD-Content)', () => {
  test('F009_AC1 a 2026 project is listed before a 2024 project, then by name', () => {
    const list = visibleProjects([
      project('old', 'Alpha', 2024),
      project('b', 'Beta', 2026),
      project('a', 'Able', 2026),
      project('mid', 'Mid', 2025),
    ]);
    expect(list.map((p) => p.id)).toEqual(['a', 'b', 'mid', 'old']);
  });

  test('F009_AC1 the registry lists the fixture projects newest year first, then by name', () => {
    expect(registry.projects.map((p) => p.id)).toEqual([
      'pocket-budget',
      'jsoncrack-clone',
      'tiny-synth',
      'main',
      'recipe-box',
      'study-buddy',
      'unity-game',
    ]);
  });

  test('F009_AC2 a hidden project is not listed', () => {
    expect(visibleProjects([project('x', 'X', 2026, true), project('y', 'Y', 2024)]).map((p) => p.id)).toEqual(['y']);
    expect(registry.projects.map((p) => p.id)).not.toContain('secret-game');
  });

  test('F-009.R4 each project has a stable address on the projects page built from its id', () => {
    expect(projectPath('unity-game')).toBe('/projects/#unity-game');
  });

  test('F-009.R4 an address maps to a prefixed card id, so a project id like "main" never names a shell element', () => {
    expect(cardIdForHash('#unity-game')).toBe('project-unity-game');
    expect(cardIdForHash('#main')).toBe('project-main');
    expect(cardIdForHash('#')).toBeUndefined();
    expect(cardIdForHash('')).toBeUndefined();
    expect(cardIdForHash('#%E0%A4%A')).toBeUndefined();
  });
});

describe('F-009 CMP-ProjectCard', () => {
  const pocket = registry.projects.find((p) => p.id === 'pocket-budget')!;
  const unity = registry.projects.find((p) => p.id === 'unity-game')!;

  test('F009_AC3 every link opens in a new tab with no opener or referrer, and says so', async () => {
    const html = await render(ProjectCard, { project: pocket, imageSrc: '/projects/images/pocket-budget.png' });
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
      expect(a).toContain('aria-describedby="project-pocket-budget-newtab"');
    }
    expect(html).toMatch(/id="project-pocket-budget-newtab"[^>]*>Opens in a new tab</);
    expect(html).toContain('href="https://example.com/pocket-budget"');
    expect(html).toContain('href="https://example.com/pocket-budget/source"');
  });

  test('F-009.R2 a card shows name as a heading, year, summary, description, tags, image and links', async () => {
    const html = await render(ProjectCard, { project: pocket, imageSrc: '/projects/images/pocket-budget.png' });
    expect(html).toMatch(/<h2[^>]*>Pocket Budget<\/h2>/);
    expect(html).toContain('2026');
    expect(html).toContain(pocket.summary);
    expect(html).toContain(pocket.description.trim());
    expect(html).toMatch(/>mobile</);
    expect(html).toMatch(/>finance</);
    expect(html).toMatch(/<img[^>]*src="\/projects\/images\/pocket-budget.png"[^>]*>/);
    expect(html).toMatch(/<img[^>]*alt="Screenshot of Pocket Budget"/);
    // The first link is primary; a source-code link is secondary (design ProjectsDesktop).
    expect(html).toMatch(/<a[^>]*data-kind="primary"[^>]*>\s*Live site/);
    expect(html).toMatch(/<a[^>]*data-kind="secondary"[^>]*>\s*Source/);
  });

  test('F-009 edge case: a project without an image shows a placeholder built from its name', async () => {
    const html = await render(ProjectCard, { project: unity });
    expect(html).not.toContain('<img');
    expect(html).toMatch(/aria-hidden="true"[^>]*>UG</);
  });

  test('F-009.R2 a project image is served from the projects page, only when set', () => {
    expect(projectImagePath(pocket)).toBe('/projects/images/pocket-budget.png');
    expect(projectImagePath(unity)).toBeUndefined();
  });
});

describe('F-009 SCR-Projects body', () => {
  test('F009_AC1 F009_AC2 the page lists visible projects in order, each a list item with its id', async () => {
    const html = await render(ProjectsView, { projects: registry.projects, images: {} });
    expect(html).toMatch(/<h1[^>]*>Things I(&#39;|')ve built<\/h1>/);
    const ids = [...html.matchAll(/<li[^>]*\bid="([^"]+)"[^>]*data-project-id="([^"]+)"/g)];
    expect(ids.map((m) => m[2])).toEqual(registry.projects.map((p) => p.id));
    expect(ids.map((m) => m[1])).toEqual(registry.projects.map((p) => `project-${p.id}`));
    expect(html).not.toContain('Secret Fixture Game');
  });

  test('F009_AC4 with no visible projects the page shows the empty state', async () => {
    const html = await render(ProjectsView, { projects: [], images: {} });
    // CMP-StateMessage renders through Preact (StateMessage.tsx), which leaves apostrophes unescaped.
    expect(html).toMatch(/I(&#39;|')m putting my projects together\. Check back soon\./);
    expect(html).toContain('class="tk-state"');
    expect(html).not.toMatch(/<ul/);
  });
});

/** A copy of the valid fixture content with one extra project, for the image checks. */
function withProject(image: string, file?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'tk-f009-'));
  cpSync(join(root, 'tests/fixtures/content/valid'), dir, { recursive: true });
  if (file) writeFileSync(join(dir, 'assets', file), 'x');
  writeFileSync(
    join(dir, 'projects', 'shot.yaml'),
    [
      'id: shot',
      'kind: project',
      'name: Shot',
      'summary: Fixture.',
      'description: Fixture.',
      `image: '${image}'`,
      'links: []',
      'year: 2026',
      'added: 2026-09-01',
    ].join('\n'),
  );
  return dir;
}
function errorsOf(contentDir: string) {
  try {
    loadRegistry({ root, contentDir });
  } catch (e) {
    if (e instanceof ContentErrors) return e.errors;
    throw e;
  }
  return [];
}

describe('F-009 project images (MOD-Content)', () => {
  test('F-009.R2 a project image with a ".." segment fails the build and names the entry', () => {
    for (const image of ['../profile.yaml.png', 'icons/../../secret.png', '/../x.png']) {
      const errors = errorsOf(withProject(image));
      const named = errors.filter((e) => e.entryId === 'shot' && e.file.endsWith('projects/shot.yaml'));
      expect(
        named.some((e) => /image/.test(e.message)),
        image,
      ).toBe(true);
    }
  });

  test('F-009.R2 an asset path that would resolve outside content/assets/ is refused', () => {
    const dir = '/site/content';
    expect(assetFile(dir, '../profile.yaml')).toBeUndefined();
    expect(assetFile(dir, 'icons/../../profile.yaml')).toBeUndefined();
    expect(assetFile(dir, '/../x.png')).toBeUndefined();
    expect(assetFile(dir, '..')).toBeUndefined();
    expect(assetFile(dir, 'icons/code.svg')).toBe('/site/content/assets/icons/code.svg');
    expect(assetFile(dir, '/icons/code.svg')).toBe('/site/content/assets/icons/code.svg');
  });

  test('F-009.R2 resolveAsset returns the file, or one ASSET error naming the file, entry and field', () => {
    const contentDir = join(root, 'tests/fixtures/content/F005-favorites');
    const site = { contentDir, file: 'content/projects/x.yaml', entryId: 'x', field: 'image', line: 3 };
    const kinds = Object.keys(IMAGE_TYPES);
    const errors: ContentError[] = [];
    expect(resolveAsset('projects/pocket-budget.png', { ...site, kinds }, errors)).toBe(
      join(contentDir, 'assets/projects/pocket-budget.png'),
    );
    expect(errors).toEqual([]);
    expect(resolveAsset('../profile.yaml', site, errors)).toBeUndefined();
    expect(resolveAsset('icons/code.svg', { ...site, kinds: ['.png'] }, errors)).toBeUndefined();
    expect(resolveAsset('projects/missing.png', { ...site, kinds }, errors)).toBeUndefined();
    expect(errors.map((e) => [e.rule, e.file, e.entryId, e.line])).toEqual(
      Array(3).fill(['ASSET', 'content/projects/x.yaml', 'x', 3]),
    );
    expect(errors.map((e) => e.message)).toEqual([
      'image "../profile.yaml" is outside content/assets/',
      'image "icons/code.svg" is not one of .png',
      'image "projects/missing.png" not found in content/assets/',
    ]);
  });

  test('F-009.R2 a project image of an unknown type fails the build and names the entry', () => {
    const errors = errorsOf(withProject('shot.gif', 'shot.gif'));
    expect(errors.some((e) => e.entryId === 'shot' && /image/.test(e.message))).toBe(true);
    expect(imageType('shot.gif')).toBeUndefined();
  });

  test('F-009.R2 every allowed image type builds and has one media type', () => {
    const schema = JSON.parse(readFileSync(join(root, 'specs/10-domain/project.schema.json'), 'utf8'));
    const pattern = new RegExp(schema.$defs.project.properties.image.pattern);
    for (const [ext, type] of Object.entries(IMAGE_TYPES)) {
      expect(pattern.test(`shot${ext}`), ext).toBe(true);
      expect(imageType(`projects/shot${ext}`)).toBe(type);
      expect(errorsOf(withProject(`shot${ext}`, `shot${ext}`)), ext).toEqual([]);
    }
  });
});
