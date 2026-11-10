// MOD-DesignSystem: CMP-ToolCard category labels on one line (CMP-ToolCard sizing, D-076).
// Without script the labels sit in a one-line box that clips a second line. Here, the labels that wrap past the first
// line are folded: they become visually hidden (still read by assistive technology) and a "+N" label takes their
// place; the box then stops wrapping, so "+N" always shows and the labels still showing are shortened with an
// ellipsis if they must be. While a label after the main one would be shortened, it is folded too. Browser only.
// Implements: F-002.R2 (every category, main first), F-002.AC13.

const BOX = '.tk-toolcard__cats';
const LABEL = '.tk-toolcard__category';
const MORE = '.tk-toolcard__more';

/** The "+N" text in the language showing, from the COPY-tool.moreCategories template on the element. */
function moreText(more: HTMLElement, count: number): string {
  const lang = document.documentElement.lang === 'vi-VN' ? 'vi-VN' : 'en-US';
  const template = more.getAttribute(`data-tpl-${lang}`) ?? '+{count}';
  return template.replace('{count}', String(count));
}

/** Folds the labels of one box that don't fit on its first line into the "+N" label. */
export function fitCategoryLabels(box: HTMLElement): void {
  const labels = [...box.querySelectorAll<HTMLElement>(LABEL)];
  const more = box.querySelector<HTMLElement>(MORE);
  // Measure with every label shown, wrapping.
  for (const l of labels) delete l.dataset.fold;
  delete box.dataset.folded;
  if (more) more.hidden = true;
  if (!more || labels.length < 2) return;
  const top = labels[0].offsetTop;
  // Labels wrap in order, so the ones past the first line are the last ones.
  let fold = labels.filter((l) => l.offsetTop > top).length;
  if (fold === 0) return;
  box.dataset.folded = '';
  more.hidden = false;
  const shortened = (l: HTMLElement) => l.scrollWidth > l.clientWidth + 1;
  for (;;) {
    labels.forEach((l, i) => {
      if (i >= labels.length - fold) l.dataset.fold = '';
      else delete l.dataset.fold;
    });
    more.textContent = moreText(more, fold);
    const showing = labels.slice(1, labels.length - fold);
    if (fold >= labels.length - 1 || !showing.some(shortened)) break;
    fold += 1;
  }
}

const watched = new Set<HTMLElement>();

// A language switch or a late web font changes label widths without resizing the box or the (possibly clamped)
// labels, so those refit every watched box too.
let globalHooks = false;
function refitAll(): void {
  for (const box of watched) if (box.isConnected) fitCategoryLabels(box);
}
function hookGlobalRefits(): void {
  if (globalHooks) return;
  globalHooks = true;
  document.fonts?.addEventListener?.('loadingdone', refitAll);
  if (typeof MutationObserver !== 'undefined')
    new MutationObserver(refitAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
}

/**
 * Fits a box now and again whenever it or a label changes size (card width, font load, language switch).
 * Returns a function that stops watching.
 */
export function watchCategoryLabels(box: HTMLElement): () => void {
  if (watched.has(box)) return () => {};
  watched.add(box);
  hookGlobalRefits();
  fitCategoryLabels(box);
  if (typeof ResizeObserver === 'undefined') return () => watched.delete(box);
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitCategoryLabels(box));
  });
  observer.observe(box);
  for (const l of box.querySelectorAll<HTMLElement>(LABEL)) observer.observe(l);
  return () => {
    observer.disconnect();
    watched.delete(box);
  };
}

/** Static cards (ToolCard.astro): every box on the page. */
export function connectCategoryLabels(root: ParentNode = document): void {
  for (const box of root.querySelectorAll<HTMLElement>(BOX)) watchCategoryLabels(box);
}
