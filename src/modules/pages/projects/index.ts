// MOD-Pages, SCR-Projects build-time helpers.
// Implements: F-009.R2 (a project's image, bundled with the portal and served next to the projects page).

/** Where a visible project's image is served: `/projects/images/<id>.<ext>`, or none without an image. */
export function projectImagePath(project: { id: string; image?: string }): string | undefined {
  if (!project.image) return undefined;
  const ext = /\.[A-Za-z0-9]+$/.exec(project.image)?.[0].toLowerCase() ?? '';
  return `/projects/images/${project.id}${ext}`;
}
