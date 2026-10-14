// MOD-Pages island on SCR-Settings: clear recents after confirming (F-006.R4, COPY-settings.clearRecents,
// COPY-settings.clearRecentsConfirm with COPY-common.confirm / COPY-common.cancel).
// Confirming empties recents through MOD-PersonalData, so every list in every window follows; cancelling, by
// button or Escape, changes nothing. Focus returns to the button either way. Before hydration the button is
// disabled, like the other device-data controls.
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
}

export default function ClearRecents({ label, question, confirmLabel, cancelLabel }: Props) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  return (
    <>
      <button ref={button} type="button" class="action" disabled={!hydrated} onClick={() => setOpen(true)}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        title={question}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => {
          personalData().clearRecents();
          close();
        }}
        onCancel={close}
      />
    </>
  );
}
