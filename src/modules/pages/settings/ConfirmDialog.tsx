// MOD-Pages on SCR-Settings: the confirmation step for destructive actions (clear recents now; import and erase
// with F-013). Design: SettingsDialogsDesktop (centered over a scrim) and SettingsDialogsMobile (a bottom sheet,
// Confirm above Cancel).
// - A native modal <dialog> named by its question (role alertdialog): focus moves into it, starting on Cancel,
//   stays inside while open, and Escape cancels (SCR-Settings accessibility: reachable by keyboard).
// - It owns focus return: the element focused when it opened gets focus back when it closes.
// Strings arrive as props (COPY ids rendered at build).
import { useEffect, useId, useRef } from 'preact/hooks';

export interface ConfirmDialogProps {
  open: boolean;
  /** The question, e.g. COPY-settings.clearRecentsConfirm. */
  title: string;
  /** COPY-common.confirm */
  confirmLabel: string;
  /** COPY-common.cancel */
  cancelLabel: string;
  onConfirm(): void;
  onCancel(): void;
}

export default function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus();
      opener.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="tk-confirm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      // Escape: the browser fires `cancel`; the caller closes it through `open`.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} class="tk-confirm__title">
        {title}
      </h2>
      <div class="tk-confirm__actions">
        <button ref={cancelRef} type="button" class="tk-confirm__cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" class="tk-confirm__confirm" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
