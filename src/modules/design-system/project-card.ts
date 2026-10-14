// MOD-DesignSystem: CMP-ProjectCard's data and element id, shared by ProjectCard.astro and the page script that
// resolves a project's address (MOD-Pages, F-009.R4). Browser-safe: types and string helpers only.
import type { EntryBase, Project } from '../../generated/domain.ts';

/** What a project card shows (CMP-ProjectCard anatomy); a `RegProject` or `CatalogProject` fits. */
export type ProjectCardData = Pick<EntryBase, 'id' | 'name' | 'summary' | 'tags'> &
  Pick<Project, 'description' | 'year' | 'links'>;

/**
 * The card's element id. Prefixed, so a project id never collides with the shell's own ids (such as `main`)
 * and the browser never jumps to a card by itself: the page script maps the address `#<id>` to it.
 */
export const projectCardId = (id: string): string => `project-${id}`;
