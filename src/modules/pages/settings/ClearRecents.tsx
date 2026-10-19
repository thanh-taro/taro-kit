// MOD-Pages island on SCR-Settings: clear recents after confirming (F-006.R4, COPY-settings.clearRecents,
// COPY-settings.clearRecentsConfirm with COPY-common.confirm / COPY-common.cancel).
// - Confirming empties recents through MOD-PersonalData, so every list in every window follows; cancelling, by
//   button or Escape, changes nothing. ConfirmDialog returns focus to the button.
// - When the clear could not be saved on the device (`unsaved`: storage refused or failing, or a newer version's
//   document, which is never overwritten), it does not look successful: COPY-settings.clearRecentsUnsaved shows
//   as an alert under the button.
// Before hydration the button is disabled, like the other device-data controls.
import { useRef, useState } from 'preact/hooks';
import { personalData } from '../../personal-data/index.ts';
import { useHydrated } from '../../shell/hydrated.ts';
import ConfirmDialog from './ConfirmDialog.tsx';

interface Props {
  /** COPY-settings.clearRecents */
  label: string;
  /** COPY-settings.clearRecentsConfirm */
  question: string;
  /** COPY-common.confirm */
  confirmLabel: string;
  /** COPY-common.cancel */
  cancelLabel: string;
  /** COPY-settings.clearRecentsUnsaved */
  unsaved: string;
}

export default function ClearRecents({ label, question, confirmLabel, cancelLabel, unsaved }: Props) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div class="clear-recents">
      <button
        ref={button}
        type="button"
        class="action"
        disabled={!hydrated}
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        {label}
      </button>
      {failed && (
        <p class="action-error" role="alert">
          <span class="mark" aria-hidden="true">
            !
          </span>
          <span>{unsaved}</span>
        </p>
      )}
      <ConfirmDialog
        open={open}
        title={question}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        returnFocus={button}
        onConfirm={() => {
          setFailed(personalData().clearRecents() === 'unsaved');
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
