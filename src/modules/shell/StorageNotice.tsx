// MOD-Shell island: the storage-unavailable notice (F-005.R5, SCR-Home error state, ADR-0010).
// When the browser refuses device storage, MOD-PersonalData keeps favorites, recents and the theme in memory
// for the session, and this notice says once, below the header, that they won't be remembered
// (COPY-storage.unavailable). It renders nothing while storage works.
import { useEffect, useState } from 'preact/hooks';
import { personalData } from '../personal-data/index.ts';

interface Props {
  /** COPY-storage.unavailable */
  message: string;
}

export default function StorageNotice({ message }: Props) {
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => personalData().storageAvailable.subscribe((ok) => setUnavailable(!ok)), []);
  if (!unavailable) return null;
  return (
    <div class="storage-notice" role="status">
      <span class="mark" aria-hidden="true">
        !
      </span>
      <span>{message}</span>
    </div>
  );
}
