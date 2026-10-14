// MOD-Backup public surface (specs/40-technical/modules/MOD-Backup.md). Export only so far (F-004.R5 reuses it);
// import (`parseBackup`, `migrate`) arrives with F-013.
export { BACKUP_FORMAT, backupFile, backupFileName, exportBackup, type ExportEnvironment } from './export.ts';
