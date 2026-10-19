// F-013 Export and import personal data: MOD-Backup's import (RULE-08: validate the whole file, one reason per
// invalid file, migration with defaults) over the fixture backup files in tests/fixtures/backups/, and
// MOD-PersonalData's replaceAll / eraseAll (replace only after the caller confirms; unsaved when the device refuses).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  backupFile,
  exportBackup,
  MAX_BACKUP_BYTES,
  migrate,
  parseBackup,
  parseBackupText,
  type ImportResult,
} from '../../src/modules/backup/index.ts';
import { t } from '../../src/modules/copy/index.ts';
import {
  createPersonalDataStore,
  emptyDocument,
  STORAGE_KEY,
  type PersonalData,
} from '../../src/modules/personal-data/index.ts';
import { importReasons } from '../../src/modules/pages/settings/import-text.ts';
import { FakeStorage } from './fakes.ts';

const FIXTURES = join(import.meta.dirname, '../fixtures/backups');
const fixture = (name: string) => readFileSync(join(FIXTURES, name), 'utf8');
const parse = (name: string) => parseBackupText(fixture(name));
const asFile = (text: string) => new Blob([text], { type: 'application/json' });
const reason = (r: ImportResult) => (r.ok ? 'ok' : r.reason);
const ok = (r: ImportResult): PersonalData => {
  if (!r.ok) throw new Error(`expected a valid file, got ${r.reason}`);
  return r.data;
};

const current = (): PersonalData => ({
  schemaVersion: 1,
  favorites: [{ toolId: 'fx-09', pinnedAt: '2026-09-01T00:00:00.000Z' }],
  recents: [{ toolId: 'fx-08', openedAt: '2026-09-02T00:00:00.000Z' }],
  preferences: { theme: 'light' },
  daysUsed: ['2026-09-02'],
});
const seeded = () => {
  const storage = new FakeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(current()));
  return { storage, store: createPersonalDataStore({ storage: () => storage }) };
};

describe('F-013.R1 export', () => {
  test('F013_AC1 exporting on 2026-10-13 saves a dated file holding favorites, recents, theme and days used', () => {
    const now = new Date(2026, 9, 13, 9, 30);
    const download = vi.fn();
    const data = current();
    exportBackup(now, { snapshot: () => data, download });
    const [name, json] = download.mock.calls[0]!;
    expect(name).toBe('tarokit-backup-2026-10-13.json');
    expect(JSON.parse(json)).toEqual({ format: 'tarokit-backup', exportedAt: now.toISOString(), data });
  });

  test('F013_AC1 an exported file imports back to the same data (round trip)', () => {
    const data = current();
    expect(ok(parseBackupText(JSON.stringify(backupFile(data, new Date()), null, 2)))).toEqual(data);
  });
});

describe('F-013.R2 RULE-08 an invalid file is rejected with its reason', () => {
  test('F013_AC2 a JSON file that is not a backup is not-a-backup', () => {
    expect(reason(parse('F013_AC2-not-a-backup.json'))).toBe('notBackup');
    expect(reason(parse('F013_AC2-not-a-backup-array.json'))).toBe('notBackup');
    expect(reason(parseBackupText('"tarokit-backup"'))).toBe('notBackup');
    expect(reason(parseBackupText('null'))).toBe('notBackup');
  });

  test('F013_AC3 a file from a newer schema version is newer-version, whatever else it holds', () => {
    expect(reason(parse('F013_AC3-newer-version.json'))).toBe('newerVersion');
  });

  test('F013_AC4 the same tool twice in recents is damaged', () => {
    expect(reason(parse('F013_AC4-duplicate-recents.json'))).toBe('damaged');
  });

  test('F013_AC4 the same tool twice in favorites is damaged', () => {
    expect(reason(parse('F013_AC4-duplicate-favorites.json'))).toBe('damaged');
  });

  test('F013_AC10 21 recents is too-many', () => {
    expect(reason(parse('F013_AC10-21-recents.json'))).toBe('tooLarge');
  });

  test('F013_AC10 25 favorites is too-many (RULE-02)', () => {
    expect(reason(parse('F013_AC10-25-favorites.json'))).toBe('tooLarge');
  });

  test.each([
    ['RULE-08-damaged-unparseable.json', 'text that is not JSON'],
    ['RULE-08-damaged-bad-timestamp.json', 'a visit time on 2026-02-30'],
    ['RULE-08-damaged-bad-tool-id.json', 'a tool id that is not a catalog id'],
    ['RULE-08-damaged-bad-theme.json', 'an unknown theme'],
    ['RULE-08-damaged-extra-field.json', 'an unknown field in a favorite'],
    ['RULE-08-damaged-missing-data.json', 'no personal data at all'],
    ['RULE-08-damaged-bad-version.json', 'a schema version that is not a whole number'],
    ['RULE-08-damaged-duplicate-days.json', 'the same date twice in days used'],
    ['RULE-08-damaged-bad-exported-at.json', 'an export time that is not a timestamp'],
    ['RULE-08-61-days-used.json', 'more than 60 days used (RULE-13; F-013 edge case)'],
  ])('RULE-08 %s (%s) is damaged', (name) => {
    expect(reason(parse(name))).toBe('damaged');
  });

  test('RULE-08 the whole file is validated: one bad entry rejects it, it is never partly imported', () => {
    const file = JSON.parse(fixture('F013_AC6-valid.json'));
    file.data.recents.push({ toolId: 'fx-77', openedAt: 'last tuesday' });
    expect(reason(parseBackupText(JSON.stringify(file)))).toBe('damaged');
  });

  test('RULE-08 a schema version of 0 or below is damaged', () => {
    const file = JSON.parse(fixture('F013_AC6-valid.json'));
    file.data.schemaVersion = 0;
    expect(reason(parseBackupText(JSON.stringify(file)))).toBe('damaged');
  });

  test('RULE-08 a null list is damaged, not missing', () => {
    const file = JSON.parse(fixture('F013_AC6-valid.json'));
    file.data.favorites = null;
    expect(reason(parseBackupText(JSON.stringify(file)))).toBe('damaged');
  });

  test('F-013 edge case: a file larger than any backup is not-a-backup, without being read', async () => {
    const text = vi.fn(() => Promise.resolve('{}'));
    expect(reason(await parseBackup({ size: MAX_BACKUP_BYTES + 1, text }))).toBe('notBackup');
    expect(text).not.toHaveBeenCalled();
  });

  test('F-013.R2 a picked file is read with the File API and validated', async () => {
    expect(ok(await parseBackup(asFile(fixture('F013_AC6-valid.json'))))).toEqual(
      JSON.parse(fixture('F013_AC6-valid.json')).data,
    );
    expect(reason(await parseBackup(asFile(fixture('F013_AC3-newer-version.json'))))).toBe('newerVersion');
  });

  test('F-013 edge case: a file that cannot be read is unreadable, not damaged', async () => {
    expect(reason(await parseBackup({ size: 10, text: () => Promise.reject(new Error('NotReadableError')) }))).toBe(
      'unreadable',
    );
  });

  test('RULE-01 a file whose recents are not newest first is damaged', () => {
    expect(reason(parse('RULE-01-damaged-recents-oldest-first.json'))).toBe('damaged');
  });

  test('NFR-05 import is prototype-pollution safe: only known fields are copied', () => {
    const data = ok(parse('RULE-08-proto-pollution.json'));
    expect(data).toEqual({ ...emptyDocument(), preferences: { theme: 'light' } });
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(data).sort()).toEqual(['daysUsed', 'favorites', 'preferences', 'recents', 'schemaVersion']);
  });

  test('F-013.R2 each reason has its COPY string inside COPY-settings.importInvalid', () => {
    expect(importReasons().notBackup).toBe(t('COPY-import.notBackup'));
    expect(importReasons().damaged).toBe(t('COPY-import.damaged'));
    expect(importReasons().newerVersion).toBe(t('COPY-import.newerVersion'));
    expect(importReasons().tooLarge).toBe(t('COPY-import.tooLarge'));
    expect(t('COPY-settings.importInvalid', { reason: importReasons().newerVersion })).toBe(
      "I couldn't import that file because it came from a newer version of TaroKit. Nothing changed.",
    );
  });
});

describe('F-013.R3 RULE-08 migration fills defaults, then validates', () => {
  test('F013_AC5 a file with no days used keeps favorites, recents and theme, with days used empty', () => {
    const data = ok(parse('F013_AC5-no-days-used.json'));
    const valid = JSON.parse(fixture('F013_AC6-valid.json')).data as PersonalData;
    expect(data).toEqual({ ...valid, daysUsed: [] });
  });

  test('F-013.R3 an older file without a schema version and with only favorites gets every default', () => {
    expect(ok(parse('F013_AC5-older-no-version-partial.json'))).toEqual({
      ...emptyDocument(),
      favorites: [{ toolId: 'fx-01', pinnedAt: '2026-10-01T00:00:00.000Z' }],
    });
  });

  test('F-013.R3 missing preferences, or a missing theme, mean theme system', () => {
    expect(migrate({ schemaVersion: 1 })).toEqual({ ...emptyDocument() });
    expect(migrate({ preferences: {} })).toEqual(emptyDocument());
  });

  test('F-013.R3 migration does not hide problems: a migrated file with a bad entry is still damaged', () => {
    const file = JSON.parse(fixture('F013_AC5-older-no-version-partial.json'));
    file.data.favorites[0].pinnedAt = 'soon';
    expect(reason(parseBackupText(JSON.stringify(file)))).toBe('damaged');
  });

  test('F-013 edge case: favorites for tools unknown here are kept (INV-04)', () => {
    const file = JSON.parse(fixture('F013_AC6-valid.json'));
    file.data.favorites.push({ toolId: 'tool-from-elsewhere', pinnedAt: '2026-10-02T00:00:00.000Z' });
    expect(ok(parseBackupText(JSON.stringify(file))).favorites.map((f) => f.toolId)).toContain('tool-from-elsewhere');
  });
});

describe('F-013.R4 / R5 replacing and erasing in the store', () => {
  test('F013_AC6 a confirmed import replaces favorites, recents, theme and days used with the file', () => {
    const { storage, store } = seeded();
    const data = ok(parse('F013_AC6-valid.json'));
    expect(store.replaceAll(data)).toBe('saved');
    expect(store.snapshot()).toEqual(data);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(data);
  });

  test('F013_AC5 importing a file with no days used empties days used', () => {
    const { store } = seeded();
    store.replaceAll(ok(parse('F013_AC5-no-days-used.json')));
    expect(store.data.value.daysUsed).toEqual([]);
    expect(store.data.value.preferences.theme).toBe('dark');
  });

  test('F013_AC2 F013_AC3 F013_AC4 F013_AC10 an invalid file never reaches the store', () => {
    const { storage, store } = seeded();
    const before = storage.getItem(STORAGE_KEY);
    for (const name of [
      'F013_AC2-not-a-backup.json',
      'F013_AC3-newer-version.json',
      'F013_AC4-duplicate-recents.json',
      'F013_AC10-21-recents.json',
    ]) {
      const result = parse(name);
      if (result.ok) store.replaceAll(result.data);
    }
    expect(storage.getItem(STORAGE_KEY)).toBe(before);
    expect(store.snapshot()).toEqual(current());
  });

  test('F013_AC8 a confirmed erase empties favorites, recents and days used and sets the theme to system', () => {
    const { storage, store } = seeded();
    expect(store.eraseAll()).toBe('saved');
    expect(store.snapshot()).toEqual(emptyDocument());
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(emptyDocument());
  });

  test('F-013 edge case: when the device refuses the write, replace reports unsaved and applies for the session', () => {
    const { storage, store } = seeded();
    storage.failWrites = true;
    const data = ok(parse('F013_AC6-valid.json'));
    expect(store.replaceAll(data)).toBe('unsaved');
    expect(store.snapshot()).toEqual(data);
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(current());
  });

  test('F013_AC8 when writing the erased data fails, the stored document is removed and the erase is saved', () => {
    const { storage, store } = seeded();
    storage.failWrites = true;
    expect(store.eraseAll()).toBe('saved');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(store.snapshot()).toEqual(emptyDocument());
    // A fresh page finds nothing stored, so the data is really gone.
    expect(createPersonalDataStore({ storage: () => storage }).snapshot()).toEqual(emptyDocument());
  });

  test('F-013 edge case: when writing and removing both fail, erase reports unsaved and applies for the session', () => {
    const { storage, store } = seeded();
    storage.failWrites = true;
    storage.failRemoves = true;
    expect(store.eraseAll()).toBe('unsaved');
    expect(store.snapshot()).toEqual(emptyDocument());
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(current());
  });

  test('F-013 edge case: with storage unavailable from the start, erase reports unsaved', () => {
    expect(createPersonalDataStore({ storage: () => null }).eraseAll()).toBe('unsaved');
  });

  test('F-013 edge case: a confirmed import or erase replaces a newer version’s document; other changes never do', () => {
    const storage = new FakeStorage();
    const newer = JSON.stringify({ ...current(), schemaVersion: 2, addedLater: true });
    storage.setItem(STORAGE_KEY, newer);
    const store = createPersonalDataStore({ storage: () => storage });
    store.recordVisit('fx-01');
    expect(storage.getItem(STORAGE_KEY)).toBe(newer);
    const data = ok(parse('F013_AC6-valid.json'));
    expect(store.replaceAll(data)).toBe('saved');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(data);
    // Now the document on disk is this version's, so ordinary changes save again.
    store.recordVisit('fx-02');
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recents[0].toolId).toBe('fx-02');

    const storage2 = new FakeStorage();
    storage2.setItem(STORAGE_KEY, newer);
    const store2 = createPersonalDataStore({ storage: () => storage2 });
    expect(store2.eraseAll()).toBe('saved');
    expect(JSON.parse(storage2.getItem(STORAGE_KEY)!)).toEqual(emptyDocument());
  });

  test('F-013 edge case: another open window picks up the replaced data', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify(current()));
    const events = new EventTarget();
    const other = createPersonalDataStore({ storage: () => storage, events: events as unknown as Window });
    const mine = createPersonalDataStore({ storage: () => storage });
    const data = ok(parse('F013_AC6-valid.json'));
    mine.replaceAll(data);
    events.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }));
    expect(other.snapshot()).toEqual(data);
    mine.eraseAll();
    events.dispatchEvent(Object.assign(new Event('storage'), { key: STORAGE_KEY }));
    expect(other.snapshot()).toEqual(emptyDocument());
  });
});
