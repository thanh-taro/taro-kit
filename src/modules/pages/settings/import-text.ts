// MOD-Pages, SCR-Settings: the import reasons' strings (F-013.R2), rendered at build and passed to the island as
// props, so the client bundle carries no copy table.
import type { ImportReason } from '../../backup/index.ts';
import { t } from '../../copy/index.ts';

export const importReasons = (): Record<ImportReason, string> => ({
  notBackup: t('COPY-import.notBackup'),
  damaged: t('COPY-import.damaged'),
  newerVersion: t('COPY-import.newerVersion'),
  tooLarge: t('COPY-import.tooLarge'),
});
