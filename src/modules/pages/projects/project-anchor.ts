// MOD-Pages, SCR-Projects in the browser: a project's address `/projects/#<id>` (F-009.R4).
// Cards carry a prefixed element id (projectCardId), so the browser never jumps to one by itself and a project
// id such as `main` never collides with the shell. On load and on every hash change, a hash naming a listed card
// scrolls that card into view and focuses it. Any other hash (an unknown or hidden project, which has no card)
// leaves the page as it is, at the top.
// Implements: F-009.R4.
import { projectCardId } from '../../design-system/project-card.ts';

/** The card element id an address hash names, or undefined for an empty or malformed hash. */
export function cardIdForHash(hash: string): string | undefined {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return undefined;
  }
  return id ? projectCardId(id) : undefined;
}

function show(): void {
  const id = cardIdForHash(location.hash);
  const card = id ? document.getElementById(id) : null;
  if (!card?.matches('[data-testid="project-card"]')) return;
  card.scrollIntoView({ block: 'start' });
  card.focus({ preventScroll: true });
}

export function projectAnchor(): void {
  // After load and one frame: the browser's own fragment handling (which scrolls to, and may focus, an element
  // whose id equals the hash, such as the shell's `main`) has run by then, so the card keeps the focus.
  const later = () => requestAnimationFrame(show);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
  window.addEventListener('hashchange', show);
}
