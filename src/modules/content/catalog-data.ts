// MOD-Content: the payload of the catalog data file that islands read: the catalog, search and the palette index.
// Visible entries only (RULE-06); source file paths and the hidden flag never leave the build.
// Pre-normalized search keys are added with MOD-Search (F-002, F-004); hashing and writing the file with them.
// Implements: F-001.R1, F-001.R4.
import type { Category } from '../../generated/domain.ts';
import type { RegProject, RegTool, Registry } from './registry.ts';

export type CatalogTool = Omit<RegTool, 'file' | 'hidden'>;
export type CatalogProject = Omit<RegProject, 'file' | 'hidden'>;
export interface CatalogData {
  /** Categories with visible tools, in display order. */
  categories: Category[];
  /** Visible tools, alphabetically. */
  tools: CatalogTool[];
  /** Visible projects, newest year first, then by name. */
  projects: CatalogProject[];
}

export function catalogData(r: Pick<Registry, 'categories' | 'visibleTools' | 'projects'>): CatalogData {
  return {
    categories: r.categories.map(({ tools: _tools, ...c }) => c),
    tools: r.visibleTools.map(({ file: _file, hidden: _hidden, ...t }) => t),
    projects: r.projects.map(({ file: _file, hidden: _hidden, ...p }) => p),
  };
}
