// MOD-Shell island: CMP-AppShell's connection and update status, from MOD-Offline's signals.
// - `header` (in the shell bar, wide screens): the quiet offline indicator, a pill (COPY-shell.offline).
// - `below` (under the shell bar): on narrow screens the same indicator as a notice; on every screen the update
//   message (COPY-shell.updateReady) with its refresh action (COPY-shell.refresh), which asks MOD-Offline to
//   activate the new version. It stays until the user refreshes; nothing here ever reloads by itself.
// Each region is a polite status that is always present (empty, and taking no space, while there is nothing to
// say), so its message is announced when it appears (CMP-AppShell accessibility).
// Implements: F-011.R3 (indicator) and F-011.R4 (message).
import { L } from '../language/L.tsx';
import type { Loc } from '../language/languages.ts';
import { activateUpdate, online, updateReady } from '../offline/index.ts';

export interface ShellStatusText {
  /** COPY-shell.offline, in both languages (F-019.R4: <L> shows the language showing). */
  offline: Loc;
  /** COPY-shell.updateReady */
  updateReady: Loc;
  /** COPY-shell.refresh */
  refresh: Loc;
  /** Build-time SVG markup from the icon set (16 px). */
  icons: { offline: string; update: string };
}

interface Props {
  place: 'header' | 'below';
  text: ShellStatusText;
}

// Build-time SVG strings from the icon set (DEP-15), never user or runtime data.
const Svg = ({ markup }: { markup: string }) => (
  <span class="tk-status__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
);

export default function ShellStatus({ place, text }: Props) {
  const offline = !online.value;
  const offlineNote = offline && (
    <>
      <Svg markup={text.icons.offline} />
      <L text={text.offline} />
    </>
  );
  if (place === 'header')
    return (
      <span class="tk-status tk-status--pill" role="status">
        {offlineNote}
      </span>
    );
  return (
    <>
      <p class="tk-status tk-status--notice" role="status">
        {offlineNote}
      </p>
      <div class="tk-status tk-status--update" role="status">
        {updateReady.value && (
          <>
            <Svg markup={text.icons.update} />
            <span class="tk-status__text">
              <L text={text.updateReady} />
            </span>
            <button type="button" class="tk-status__refresh" onClick={() => void activateUpdate()}>
              <L text={text.refresh} />
            </button>
          </>
        )}
      </div>
    </>
  );
}
