// MOD-Pages island on SCR-Settings: erase all personal data after confirming (F-013.R5, COPY-settings.erase,
// COPY-settings.eraseConfirm with COPY-common.confirm / COPY-common.cancel).
// - Confirming empties favorites, recents and days used and sets the theme to system (MOD-PersonalData
//   `eraseAll`), so every island and other open windows follow. Cancel or Escape changes nothing.
// - The confirmation's Confirm has the danger tone (design SettingsDialogs: erase can't be undone).
// - When the erase can't be saved on the device it does not look successful: COPY-settings.eraseUnsaved shows as an
//   alert, like clear recents (F-006.R4).
import { useState } from 'preact/hooks';
import { personalData } from '../../personal-data/index.ts';
import { useHydrated } from '../../shell/hydrated.ts';
import ConfirmDialog from './ConfirmDialog.tsx';

interface Props {
  /** COPY-settings.erase */
  label: string;
  /** COPY-settings.eraseConfirm */
  question: string;
  /** COPY-common.confirm */
  confirmLabel: string;
  /** COPY-common.cancel */
  cancelLabel: string;
  /** COPY-settings.eraseUnsaved */
  unsaved: string;
}

export default function EraseData({ label, question, confirmLabel, cancelLabel, unsaved }: Props) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div class="erase-data">
      <button
        type="button"
        class="action action--danger"
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
        tone="danger"
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => {
          setFailed(personalData().eraseAll() === 'unsaved');
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
