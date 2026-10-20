// MOD-Pages: SCR-Resume data, built at build time from the registry's résumé (F-017). Pure. Months are absolute,
// so they are formatted once at build, with the changelog's month-group formatter (RULE-15: "June 2022").
// Implements: F-017.R1 (RULE-15 order, empty sections left out, entries in written order), F-017.R2, F-017.R3.
import type { Resume } from '../../../generated/domain.ts';
import { paragraphs } from '../../content/profile.ts';
import { RESUME_SECTIONS, type ResumeSection } from '../../content/resume.ts';
import { t } from '../../copy/index.ts';
import { monthLabel } from '../now/now.ts';

/** One piece of a period as COPY-resume.period lays it out: a month (machine-readable) or the text between. */
export interface PeriodPart {
  text: string;
  /** YYYY-MM, for `<time datetime>` (SCR-Resume accessibility). Absent for separators and COPY-resume.present. */
  datetime?: string;
}
export interface Period {
  parts: PeriodPart[];
  /** The whole period as read: "June 2022 – present". */
  text: string;
  /** No end month: the period runs to the present (COPY-resume.present). */
  current: boolean;
}
export interface ExperienceItem {
  role: string;
  organization: string;
  period: Period;
  /** The summary, one string per paragraph (F-017 edge case: paragraph breaks are kept). */
  summary: string[];
  highlights: string[];
}
export interface EducationItem {
  program: string;
  institution: string;
  level?: string;
  period: Period;
  notes: string[];
}
export interface SkillItem {
  name: string;
  /** RULE-15: 5 marks, `level` of them filled; absent when the skill has no level. */
  marks?: boolean[];
  /** COPY-resume.skillLevel: "5 out of 5". */
  levelText?: string;
}
export interface LanguageItem {
  name: string;
  level: string;
}
export interface CreditItem {
  /** A certificate's name or an award's title. */
  name: string;
  issuer: string;
  year: number;
}
export interface ResumeViewData {
  /** The sections that have entries, in RULE-15 order. */
  sections: ResumeSection[];
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  certificates: CreditItem[];
  awards: CreditItem[];
}

/** COPY-resume.<section>: each section's heading. */
export const sectionTitle = (section: ResumeSection): string => t(`COPY-resume.${section}`);

const START = '\u0001';
const END = '\u0002';

/** RULE-15: "June 2022 – present", in COPY-resume.period's order, with each month machine-readable. */
export function period(start: string, end?: string): Period {
  const months: Record<string, PeriodPart> = {
    [START]: { text: monthLabel(start), datetime: start },
    [END]: end ? { text: monthLabel(end), datetime: end } : { text: t('COPY-resume.present') },
  };
  const parts = t('COPY-resume.period', { start: START, end: END })
    .split(new RegExp(`(${START}|${END})`))
    .filter(Boolean)
    .map((piece) => months[piece] ?? { text: piece });
  return { parts, text: parts.map((p) => p.text).join(''), current: !end };
}

/** RULE-15: a skill level as 5 marks with `level` filled, and in words. */
export const skillMarks = (level: number): boolean[] => Array.from({ length: 5 }, (_, i) => i < level);

export function resumeView(resume: Resume): ResumeViewData {
  const view: ResumeViewData = {
    sections: [],
    experience: (resume.experience ?? []).map((e) => ({
      role: e.role,
      organization: e.organization,
      period: period(e.start, e.end),
      summary: paragraphs(e.summary),
      highlights: e.highlights ?? [],
    })),
    education: (resume.education ?? []).map((e) => ({
      program: e.program,
      institution: e.institution,
      level: e.level,
      period: period(e.start, e.end),
      notes: e.notes ? paragraphs(e.notes) : [],
    })),
    skills: (resume.skills ?? []).map((s) =>
      s.level === undefined
        ? { name: s.name }
        : { name: s.name, marks: skillMarks(s.level), levelText: t('COPY-resume.skillLevel', { level: s.level }) },
    ),
    languages: (resume.languages ?? []).map((l) => ({ name: l.name, level: l.level })),
    certificates: (resume.certificates ?? []).map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
    awards: (resume.awards ?? []).map((a) => ({ name: a.title, issuer: a.issuer, year: a.year })),
  };
  view.sections = RESUME_SECTIONS.filter((s) => view[s].length > 0);
  return view;
}
