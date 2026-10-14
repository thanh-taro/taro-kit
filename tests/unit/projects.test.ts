// F-009 Showcase projects: MOD-Content's project order (R1, RULE-06), CMP-ProjectCard (R2) and the SCR-Projects
// body (R1 to R3) rendered through Astro's container API. Content: tests/fixtures/content/F009-projects.
// Browser behavior (new tab on activation, the #<id> address) is verified in tests/e2e/projects.spec.ts.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadRegistry, projectPath, visibleProjects } from '../../src/modules/content/index.ts';
import ProjectCard from '../../src/modules/design-system/ProjectCard.astro';
import { projectImagePath } from '../../src/modules/pages/projects/index.ts';
import ProjectsView from '../../src/modules/pages/projects/ProjectsView.astro';

const root = join(import.meta.dirname, '../..');
const registry = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/F009-projects') });

async function render(component: Parameters<AstroContainer['renderToString']>[0], props = {}) {
  const container = await AstroContainer.create();
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
});

describe('F-009 CMP-ProjectCard', () => {
  const pocket = registry.projects.find((p) => p.id === 'pocket-budget')!;
  const unity = registry.projects.find((p) => p.id === 'unity-game')!;

  test('F009_AC3 every link opens in a new tab with no opener or referrer, and says so', async () => {
    const html = await render(ProjectCard, { project: pocket, imageSrc: '/projects/images/pocket-budget.svg' });
    const links = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
      expect(a).toContain('aria-describedby="pocket-budget-newtab"');
    }
    expect(html).toMatch(/id="pocket-budget-newtab"[^>]*>Opens in a new tab</);
    expect(html).toContain('href="https://example.com/pocket-budget"');
    expect(html).toContain('href="https://example.com/pocket-budget/source"');
  });

  test('F-009.R2 a card shows name as a heading, year, summary, description, tags, image and links', async () => {
    const html = await render(ProjectCard, { project: pocket, imageSrc: '/projects/images/pocket-budget.svg' });
    expect(html).toMatch(/<h2[^>]*>Pocket Budget<\/h2>/);
    expect(html).toContain('2026');
    expect(html).toContain(pocket.summary);
    expect(html).toContain(pocket.description.trim());
    expect(html).toMatch(/>mobile</);
    expect(html).toMatch(/>finance</);
    expect(html).toMatch(/<img[^>]*src="\/projects\/images\/pocket-budget.svg"[^>]*>/);
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
    expect(projectImagePath(pocket)).toBe('/projects/images/pocket-budget.svg');
    expect(projectImagePath(unity)).toBeUndefined();
  });
});

describe('F-009 SCR-Projects body', () => {
  test('F009_AC1 F009_AC2 the page lists visible projects in order, each a list item with its id', async () => {
    const html = await render(ProjectsView, { projects: registry.projects, images: {} });
    expect(html).toMatch(/<h1[^>]*>Things I(&#39;|')ve built<\/h1>/);
    const ids = [...html.matchAll(/<li[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(registry.projects.map((p) => p.id));
    expect(html).not.toContain('Secret Fixture Game');
  });

  test('F009_AC4 with no visible projects the page shows the empty state', async () => {
    const html = await render(ProjectsView, { projects: [], images: {} });
    expect(html).toContain('I&#39;m putting my projects together. Check back soon.');
    expect(html).toContain('class="tk-state"');
    expect(html).not.toMatch(/<ul/);
  });
});
