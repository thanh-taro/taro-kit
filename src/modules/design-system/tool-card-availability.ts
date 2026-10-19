// MOD-DesignSystem: the live unavailable state of static CMP-ToolCards (catalog, category pages), which are rendered
// at build and never hydrate. Offline, a card marked `data-tk-needs-internet` (its tool is linked or not
// offline-capable, needsInternet) is dimmed and shows COPY-tool.unavailable, which then also describes its link;
// online, both are removed again. Island cards follow MOD-Offline's `online` signal themselves.
// Implements: F-011.R3 (cards), with MOD-Offline's `online` signal driving it.

/** Puts every static card under `root` into the state for `online`. */
export function syncStaticCards(root: ParentNode, online: boolean): void {
  for (const card of root.querySelectorAll<HTMLElement>('[data-tk-needs-internet]')) {
    const id = card.dataset.tkNeedsInternet!;
    const note = card.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
    const link = card.querySelector<HTMLElement>('.tk-toolcard__link');
    if (!note || !link) continue;
    const ids = (link.getAttribute('aria-describedby') ?? '').split(' ').filter((x) => x && x !== id);
    if (!online) ids.push(id);
    card.toggleAttribute('data-unavailable', !online);
    note.hidden = online;
    if (ids.length) link.setAttribute('aria-describedby', ids.join(' '));
    else link.removeAttribute('aria-describedby');
  }
}

/** Keeps the page's static cards in step with `online` (a signal-like value with subscribe). */
export function connectCardAvailability(online: { subscribe(fn: (value: boolean) => void): () => void }): void {
  online.subscribe((value) => syncStaticCards(document, value));
}
