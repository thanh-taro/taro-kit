// MOD-Pages, SCR-Settings: the import reasons' strings (F-013.R2), rendered at build and passed to the island as
// props, so the client bundle carries no copy table.
import type { ImportReason } from '../../backup/index.ts';
import { tBoth } from '../../copy/index.ts';
import type { Loc } from '../../language/languages.ts';

export const importReasons = (): Record<ImportReason, Loc> => ({
  notBackup: tBoth('COPY-import.notBackup'),
  damaged: tBoth('COPY-import.damaged'),
  newerVersion: tBoth('COPY-import.newerVersion'),
  tooLarge: tBoth('COPY-import.tooLarge'),
});
