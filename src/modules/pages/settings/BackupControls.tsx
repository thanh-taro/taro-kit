// MOD-Pages island on SCR-Settings: export and import (F-013.R1, F-013.R2, F-013.R4, F-013.R6).
// - Export saves the backup file through MOD-Backup (lazy-loaded, as in the palette). A failure says so
//   (COPY-settings.exportFailed).
// - Import picks a file with a native file input (File API only; nothing is uploaded or put in an address) and
//   MOD-Backup validates it whole while the import control shows progress (SCR-Settings loading state).
//   - An invalid file shows COPY-settings.importInvalid with its reason, announced, and nothing changes.
//   - A valid file opens the confirmation (COPY-settings.importConfirm, with the file's name); only Confirm replaces
//     the personal data (MOD-PersonalData `replaceAll`), so every island and other open windows follow. Cancel or
//     Escape changes nothing. When the replace can't be saved on the device, COPY-settings.importUnsaved says so.
// - The note under the buttons says tool data is not in the backup (COPY-settings.backupScope).
// The import control is never disabled while busy, so focus stays on it and returns to it from the confirmation.
import { useRef, useState } from 'preact/hooks';
import type { ImportReason } from '../../backup/index.ts';
import { personalData, type PersonalData } from '../../personal-data/index.ts';
import { useHydrated } from '../../shell/hydrated.ts';
import ConfirmDialog from './ConfirmDialog.tsx';

interface Props {
  /** COPY-settings.export */
  exportLabel: string;
  /** COPY-settings.import */
  importLabel: string;
  /** COPY-settings.backupScope */
  scope: string;
  /** COPY-settings.importInvalid rendered with the literal `{reason}` left in place. */
  invalidTemplate: string;
  /** COPY-import.* by reason. */
  reasons: Record<ImportReason, string>;
  /** COPY-settings.importConfirm */
  question: string;
  /** COPY-common.confirm */
  confirmLabel: string;
  /** COPY-common.cancel */
  cancelLabel: string;
  /** COPY-settings.importUnsaved */
  unsaved: string;
  /** COPY-settings.exportFailed */
  exportFailed: string;
}

type Problem = { kind: 'invalid'; reason: ImportReason } | { kind: 'unsaved' } | { kind: 'exportFailed' };

const loadBackup = () => import('../../backup/index.ts');

export default function BackupControls(props: Props) {
  const hydrated = useHydrated();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [pending, setPending] = useState<{ data: PersonalData; name: string } | null>(null);

  const exportNow = () => {
    setProblem(null);
    loadBackup()
      .then((m) => m.exportBackup())
      .catch(() => setProblem({ kind: 'exportFailed' }));
  };

  const pick = () => {
    if (busy) return;
    setProblem(null);
    input.current?.click();
  };

  const onPicked = async () => {
    const el = input.current;
    const file = el?.files?.[0];
    if (!el || !file) return;
    el.value = ''; // the same file can be picked again
    setBusy(true);
    try {
      const result = await (await loadBackup()).parseBackup(file);
      if (result.ok) setPending({ data: result.data, name: file.name });
      else setProblem({ kind: 'invalid', reason: result.reason });
    } catch {
      // The validator's code could not load (e.g. offline before it was cached): nothing was read or changed.
      setProblem({ kind: 'invalid', reason: 'damaged' });
    } finally {
      setBusy(false);
    }
  };

  const message =
    problem?.kind === 'invalid'
      ? props.invalidTemplate.replace('{reason}', props.reasons[problem.reason])
      : problem?.kind === 'unsaved'
        ? props.unsaved
        : problem?.kind === 'exportFailed'
          ? props.exportFailed
          : null;

  return (
    <div class="backup">
      <div class="actions">
        <button type="button" class="action action--primary" disabled={!hydrated} onClick={exportNow}>
          {props.exportLabel}
        </button>
        <button
          type="button"
          class="action"
          disabled={!hydrated}
          aria-busy={busy ? 'true' : undefined}
          aria-disabled={busy ? 'true' : undefined}
          onClick={pick}
        >
          {busy && <span class="spinner" aria-hidden="true" />}
          {props.importLabel}
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          tabIndex={-1}
          aria-hidden="true"
          data-testid="import-file"
          onChange={() => void onPicked()}
        />
      </div>
      {message && (
        <p class="action-error" role="alert">
          <span class="mark" aria-hidden="true">
            !
          </span>
          <span>{message}</span>
        </p>
      )}
      <p class="scope">{props.scope}</p>
      <ConfirmDialog
        open={pending !== null}
        title={props.question}
        detail={pending?.name}
        confirmLabel={props.confirmLabel}
        cancelLabel={props.cancelLabel}
        onConfirm={() => {
          if (pending && personalData().replaceAll(pending.data) === 'unsaved') setProblem({ kind: 'unsaved' });
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
