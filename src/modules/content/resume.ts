// MOD-Content: the résumé (ENT-Resume) as the rest of the portal reads it. Pure, no Node imports.
// Implements: F-017.R1 (RULE-15 section order, empty sections left out), F-017.R4 (no entries means no résumé),
// F-017.R5 (an entry is named by its section and its position, counting from 1), INV-08.
import type { Resume } from '../../generated/domain.ts';

/** The Résumé page's portal address (MOD-Pages), published only when there is a résumé (F-017.R4). */
export const RESUME_PATH = '/resume/';

/** RULE-15: the order the sections appear in. */
export const RESUME_SECTIONS = ['experience', 'education', 'skills', 'languages', 'certificates', 'awards'] as const;
export type ResumeSection = (typeof RESUME_SECTIONS)[number];

/** ENT-Resume: a résumé with no entries in any section counts as no résumé. */
export const hasResumeEntries = (resume: Resume | null | undefined): resume is Resume =>
  !!resume && RESUME_SECTIONS.some((s) => (resume[s]?.length ?? 0) > 0);

/** F-017.R5: "experience 3" for the third experience entry. */
export const resumeEntryName = (section: string, index: number): string => `${section} ${index + 1}`;

/** One INV-08 break: an experience or education entry whose end month is before its start month. */
export interface ResumePeriodError {
  section: 'experience' | 'education';
  index: number;
  start: string;
  end: string;
}

/**
 * INV-08: in the résumé, an experience or education end month, when present, is on or after its start month.
 * Months are YYYY-MM (`$defs/yearMonth`), so they compare as strings; the caller skips months the schema rejected,
 * whose schema error already names them. An end later than today is allowed (F-017 edge case: a planned end date).
 */
export function resumePeriodErrors(resume: unknown): ResumePeriodError[] {
  if (typeof resume !== 'object' || resume === null) return [];
  const out: ResumePeriodError[] = [];
  for (const section of ['experience', 'education'] as const) {
    const list = (resume as Record<string, unknown>)[section];
    if (!Array.isArray(list)) continue;
    list.forEach((entry: unknown, index) => {
      if (typeof entry !== 'object' || entry === null) return;
      const { start, end } = entry as { start?: unknown; end?: unknown };
      if (typeof start === 'string' && typeof end === 'string' && end < start) out.push({ section, index, start, end });
    });
  }
  return out;
}
