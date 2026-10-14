// MOD-Pages what's new helper: RULE-04 against the viewer's local date (F-007.R4, F-001.R1, RULE-06).
import { describe, expect, it } from 'vitest';
import { daysBetween, localDate, whatsNew } from '../../src/modules/pages/whats-new.ts';

const tool = (id: string, added: string, updated?: string, hidden = false) => ({
  id,
  name: id.toUpperCase(),
  added,
  updated,
  hidden,
});

describe('RULE-04 what’s new', () => {
  it('RULE-04 lists tools whose latest date is within the last 30 days, today included', () => {
    const items = whatsNew(
      [tool('a', '2026-10-11'), tool('b', '2026-08-15'), tool('c', '2026-09-15'), tool('d', '2026-09-14')],
      '2026-10-14',
    );
    // 2026-09-15 is the 30th day counting today; 2026-09-14 is the 31st.
    expect(items.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('RULE-04 lists a tool once, as updated, ranked by its updated date', () => {
    const items = whatsNew([tool('old', '2026-10-04', '2026-10-12'), tool('new', '2026-10-10')], '2026-10-14');
    expect(items).toEqual([
      { id: 'old', name: 'OLD', type: 'updated', date: '2026-10-12' },
      { id: 'new', name: 'NEW', type: 'added', date: '2026-10-10' },
    ]);
  });

  it('RULE-04 labels a tool added and updated on the same day as updated', () => {
    expect(whatsNew([tool('same', '2026-10-12', '2026-10-12')], '2026-10-14')).toEqual([
      { id: 'same', name: 'SAME', type: 'updated', date: '2026-10-12' },
    ]);
  });

  it('RULE-04 orders same-date items by name', () => {
    const items = whatsNew([tool('beta', '2026-10-12'), tool('alpha', '2026-10-01', '2026-10-12')], '2026-10-14');
    expect(items.map((i) => i.id)).toEqual(['alpha', 'beta']);
  });

  it('RULE-04 keeps the 6 newest of 8 recent tools', () => {
    const tools = Array.from({ length: 8 }, (_, i) => tool(`t${i + 1}`, `2026-10-0${i + 1}`));
    expect(whatsNew(tools, '2026-10-14').map((i) => i.id)).toEqual(['t8', 't7', 't6', 't5', 't4', 't3']);
  });

  it('RULE-04 tolerates a date one day ahead of the viewer, and no more', () => {
    const tools = [tool('tomorrow', '2026-10-15'), tool('in-two-days', '2026-10-16')];
    expect(whatsNew(tools, '2026-10-14').map((i) => i.id)).toEqual(['tomorrow']);
  });

  it('RULE-04 leaves out a tool dated a year in the future', () => {
    expect(whatsNew([tool('future', '2027-10-14')], '2026-10-14')).toEqual([]);
  });

  it('RULE-06 leaves hidden tools out of what’s new', () => {
    expect(whatsNew([tool('h', '2026-10-13', undefined, true)], '2026-10-14')).toEqual([]);
  });
});

describe('viewer dates', () => {
  it('localDate formats the local calendar date, not the UTC one', () => {
    // 23:30 local on 9 March: a UTC-based date would roll over in zones east of UTC.
    expect(localDate(new Date(2026, 2, 9, 23, 30))).toBe('2026-03-09');
    expect(localDate(new Date(2026, 11, 31, 0, 5))).toBe('2026-12-31');
    expect(localDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('daysBetween counts calendar days across a month end', () => {
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1);
    expect(daysBetween('2026-10-14', '2026-10-13')).toBe(-1);
  });
});
