// MOD-Backup export: the personal data wrapped in a backup file (RULE-08) and saved on the device through a
// download named with the local date (F-013.R1, platform-mapping: Blob plus <a download>). Nothing touches the
// network (INV-05). Lazy-loaded: the palette's export action (F-004.R5) imports it only when run.
// Import, migration and validation are F-013's (parseBackup, migrate).
// Implements: F-013.R1 (export), reused by F-004.R5.
import type { BackupFile } from '../../generated/domain.ts';
import { localDate, personalData, type PersonalData } from '../personal-data/index.ts';

export const BACKUP_FORMAT = 'tarokit-backup';
/** How long the download's object URL is kept before it is released. */
export const REVOKE_AFTER_MS = 30_000;

/** `tarokit-backup-YYYY-MM-DD.json`, with the device's local date (F-013.R1). */
export const backupFileName = (now: Date): string => `${BACKUP_FORMAT}-${localDate(now)}.json`;

/** RULE-08: the personal data plus its schema version (inside `data`) and the export time. */
export function backupFile(data: PersonalData, now: Date): BackupFile {
  return { format: BACKUP_FORMAT, exportedAt: now.toISOString(), data };
}

export interface ExportEnvironment {
  /** MOD-PersonalData `snapshot()`. */
  snapshot(): PersonalData;
  /** Saves `json` on the device as `name`. */
  download(name: string, json: string): void;
}

function browserDownload(name: string, json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Released well after the click: some browsers start reading the URL only after the download prompt.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}

const browser = (): ExportEnvironment => ({
  snapshot: () => personalData().snapshot(),
  download: browserDownload,
});

/** Saves a backup file of all personal data on the device (F-013.R1). */
export function exportBackup(now: Date = new Date(), env: ExportEnvironment = browser()): void {
  env.download(backupFileName(now), JSON.stringify(backupFile(env.snapshot(), now), null, 2));
}
