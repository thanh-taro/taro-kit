// MOD-Backup public surface (specs/40-technical/modules/MOD-Backup.md): export (F-013.R1, reused by the palette,
// F-004.R5) and import with validation and migration (F-013.R2, F-013.R3, RULE-08). Lazy-loaded by its callers.
export { BACKUP_FORMAT, backupFile, backupFileName, exportBackup, type ExportEnvironment } from './export.ts';
export {
  MAX_BACKUP_BYTES,
  migrate,
  parseBackup,
  parseBackupText,
  validateBackup,
  type ImportFailure,
  type ImportReason,
  type ImportResult,
} from './import.ts';
