// MOD-Pages on SCR-Settings: the confirmation step for destructive actions (clear recents, import and erase). Design: SettingsDialogsDesktop (centered over a scrim) and SettingsDialogsMobile (a bottom sheet,
// Confirm above Cancel).
// - A native modal <dialog> named by its question (role alertdialog): focus moves into it, starting on Cancel,
//   stays inside while open, and Escape cancels (SCR-Settings accessibility: reachable by keyboard).
// - It owns focus return: `returnFocus` (the control that opened it) gets focus back when it closes; without it,
//   the element focused when it opened. The explicit target matters where the opener never held focus: Safari
//   doesn't focus a button on a mouse click, and a file pick can end with focus on the page (QA a11y m9).
// - `tone='danger'` gives Confirm the danger color (erase, design SettingsDialogs); `detail` is a muted line under
//   the question (the picked file's name on import).
// Strings arrive as props (COPY ids rendered at build).
import type { RefObject } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';

export interface ConfirmDialogProps {
  open: boolean;
  /** The question, e.g. COPY-settings.clearRecentsConfirm. */
  title: string;
  /** COPY-common.confirm */
  confirmLabel: string;
  /** COPY-common.cancel */
  cancelLabel: string;
  /** A muted line under the question, e.g. the picked file's name. */
  detail?: string;
  /** `danger` for an action that can't be undone (erase). */
  tone?: 'danger';
  /** The control that opened the dialog: focus returns here on close. */
  returnFocus?: RefObject<HTMLElement>;
  onConfirm(): void;
  onCancel(): void;
}

export default function ConfirmDialog({
  open,
  title,
  confirmLabel,
  cancelLabel,
  detail,
  tone,
  returnFocus,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const detailId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current =
        returnFocus?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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
      aria-describedby={detail ? detailId : undefined}
      // Escape: the browser fires `cancel`; the caller closes it through `open`.
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id={titleId} class="tk-confirm__title">
        {title}
      </h2>
      {detail && (
        <p id={detailId} class="tk-confirm__detail">
          {detail}
        </p>
      )}
      <div class="tk-confirm__actions">
        <button ref={cancelRef} type="button" class="tk-confirm__cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          class={tone === 'danger' ? 'tk-confirm__confirm tk-confirm__confirm--danger' : 'tk-confirm__confirm'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
