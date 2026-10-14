// MOD-Shell island: the one-time storage-unavailable notice (F-005.R5, SCR-Home error state, ADR-0010).
// When the browser refuses device storage, MOD-PersonalData keeps favorites, recents and the theme in memory
// for the session, and this notice says, below the header, that they won't be remembered
// (COPY-storage.unavailable). One-time: it shows on the first page of a browser session where storage is
// unavailable (a sessionStorage flag). If sessionStorage is refused too, a module flag still limits it to
// once per page. It renders nothing while storage works.
import { useEffect, useState } from 'preact/hooks';
import { personalData } from '../personal-data/index.ts';

/** sessionStorage key marking that the notice was shown in this browser session. */
export const NOTICE_SHOWN_KEY = 'tarokit.storageNoticeShown';
let shownThisPage = false;

/** True the first time it is called in a browser session (or, without sessionStorage, in a page). */
export function claimStorageNotice(session: () => Storage | null = () => window.sessionStorage): boolean {
  if (shownThisPage) return false;
  shownThisPage = true;
  try {
    const s = session();
    if (!s) return true;
    if (s.getItem(NOTICE_SHOWN_KEY)) return false;
    s.setItem(NOTICE_SHOWN_KEY, '1');
  } catch {
    // sessionStorage refused as well: once per page.
  }
  return true;
}

/** For tests: forget that the notice was shown on this page. */
export const resetStorageNoticeForTests = (): void => {
  shownThisPage = false;
};

interface Props {
  /** COPY-storage.unavailable */
  message: string;
}

export default function StorageNotice({ message }: Props) {
  const [show, setShow] = useState(false);
  useEffect(
    () =>
      personalData().storageAvailable.subscribe((ok) => {
        if (!ok && claimStorageNotice()) setShow(true);
      }),
    [],
  );
  if (!show) return null;
  return (
    <div class="storage-notice" role="status">
      <span class="mark" aria-hidden="true">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}
