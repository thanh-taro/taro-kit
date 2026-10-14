// MOD-Pages, SCR-Projects in the browser: a project's address `/projects/#<id>` (F-009.R4).
// On load and on every hash change, a hash naming a listed card scrolls that card into view and focuses it.
// Any other hash (an unknown or hidden project, which has no card) leaves the page as it is, at the top.
// Implements: F-009.R4.

function cardFor(hash: string): HTMLElement | null {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return null;
  }
  if (!id) return null;
  const el = document.getElementById(id);
  return el?.matches('[data-testid="project-card"]') ? el : null;
}

function show(): void {
  const card = cardFor(location.hash);
  if (!card) return;
  card.scrollIntoView({ block: 'start' });
  card.focus({ preventScroll: true });
}

export function projectAnchor(): void {
  show();
  window.addEventListener('hashchange', show);
}
