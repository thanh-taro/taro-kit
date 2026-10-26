// MOD-Pages island on SCR-Settings: erase all personal data after confirming (F-013.R5, COPY-settings.erase,
// COPY-settings.eraseConfirm with COPY-common.confirm / COPY-common.cancel).
// - Confirming empties favorites, recents and days used and sets the theme to system (MOD-PersonalData
//   `eraseAll`), so every island and other open windows follow. Cancel or Escape changes nothing.
// - The confirmation's Confirm has the danger tone (design SettingsDialogs: erase can't be undone).
// - When the erase can't be saved on the device it does not look successful: COPY-settings.eraseUnsaved shows as an
//   alert, like clear recents (F-006.R4).
import { useRef, useState } from 'preact/hooks';
import { personalData } from '../../personal-data/index.ts';
import { useHydrated } from '../../shell/hydrated.ts';
import { L } from '../../language/L.tsx';
import type { Loc } from '../../language/languages.ts';
import ConfirmDialog from './ConfirmDialog.tsx';

interface Props {
  /** COPY-settings.erase */
  label: Loc;
  /** COPY-settings.eraseConfirm */
  question: Loc;
  /** COPY-common.confirm */
  confirmLabel: Loc;
  /** COPY-common.cancel */
  cancelLabel: Loc;
  /** COPY-settings.eraseUnsaved */
  unsaved: Loc;
}

export default function EraseData({ label, question, confirmLabel, cancelLabel, unsaved }: Props) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  return (
    <div class="erase-data">
      <button
        ref={button}
        type="button"
        class="action action--danger"
        disabled={!hydrated}
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        <L text={label} />
      </button>
      {failed && (
        <p class="action-error" role="alert">
          <span class="mark" aria-hidden="true">
            !
          </span>
          <span>
            <L text={unsaved} />
          </span>
        </p>
      )}
      <ConfirmDialog
        open={open}
        title={question}
        tone="danger"
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        returnFocus={button}
        onConfirm={() => {
          setFailed(personalData().eraseAll() === 'unsaved');
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
