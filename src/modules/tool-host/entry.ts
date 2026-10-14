// MOD-ToolHost page script for /t/<id>/ (SCR-ToolView), embedded and linked alike.
// - Focus moves to the tool header on entry (SCR-ToolView accessibility).
// - CMP-ToolHeader's back goes to the previous page when it was a portal page; otherwise the link's own
//   address (home) is followed, so a direct visit never leaves the portal.

export function focusToolHeader(doc: Document = document): void {
  doc.querySelector<HTMLElement>('.tk-toolheader')?.focus({ preventScroll: true });
}

export function handleBack(event: MouseEvent): void {
  const link = event.target instanceof Element ? event.target.closest('[data-tk-back]') : null;
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  let fromPortal = false;
  try {
    fromPortal = !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch {
    fromPortal = false;
  }
  if (fromPortal && history.length > 1) {
    event.preventDefault();
    history.back();
  }
}

export function connectToolPage(): void {
  focusToolHeader();
  document.addEventListener('click', handleBack);
}
