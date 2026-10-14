// MOD-ToolHost: recording a linked tool's visit when a link to its own address is followed (F-006.R1).
// Cards stay plain links (CMP-ToolCard), so one delegated listener per page records the visit:
// - a link marked `data-tk-visit="<id>"` (CMP-ToolCard marks a linked tool's link);
// - any link inside an element marked `data-tk-visit-links="<id>"` (the linked note on SCR-ToolView).
// A plain click, a modified click and a middle click all open the address, so all of them count. Merely showing
// the linked note records nothing (F-006.AC3); embedded tools are recorded by the tool view (ToolFrame).
import { personalData } from '../personal-data/index.ts';

/** The tool whose own address the link under `target` opens, or null when it opens none. */
export function visitTarget(target: Element): string | null {
  const link = target.closest('a[href]');
  if (!link) return null;
  return (
    link.getAttribute('data-tk-visit') ??
    link.closest('[data-tk-visit-links]')?.getAttribute('data-tk-visit-links') ??
    null
  );
}

/** Installs the listener on the page; returns a function that removes it. */
export function connectVisitRecording(
  doc: Pick<Document, 'addEventListener' | 'removeEventListener'> = document,
  record: (toolId: string) => void = (id) => personalData().recordVisit(id),
): () => void {
  const onClick = (event: Event) => {
    const e = event as MouseEvent;
    if (e.defaultPrevented || e.button > 1 || !(e.target instanceof Element)) return;
    const id = visitTarget(e.target);
    if (id) record(id);
  };
  // `click` covers the primary button (and Enter); `auxclick` the middle button.
  doc.addEventListener('click', onClick);
  doc.addEventListener('auxclick', onClick);
  return () => {
    doc.removeEventListener('click', onClick);
    doc.removeEventListener('auxclick', onClick);
  };
}
