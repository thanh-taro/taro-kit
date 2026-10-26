// MOD-Pages: SCR-Resume data, built at build time from the registry's résumé (F-017). Pure. Months are absolute,
// so they are formatted once at build, with the changelog's month-group formatter (RULE-15: "June 2022").
// Implements: F-017.R1 (RULE-15 order, empty sections left out, entries in written order), F-017.R2, F-017.R3.
import type { Resume } from '../../../generated/domain.ts';
import { paragraphs } from '../../content/profile.ts';
import { RESUME_SECTIONS, type ResumeSection } from '../../content/resume.ts';
import { formatMonth, t, tBoth } from '../../copy/index.ts';
import { both, LANGUAGES, pick, type Lang, type Loc, type Text } from '../../language/languages.ts';

/** One piece of a period as COPY-resume.period lays it out: a month (machine-readable) or the text between. */
export interface PeriodPart {
  text: string;
  /** YYYY-MM, for `<time datetime>` (SCR-Resume accessibility). Absent for separators and COPY-resume.present. */
  datetime?: string;
}
export interface Period {
  /** The pieces in each language (F-019.R4): "June 2022 – present", "tháng 6 năm 2022 – nay". */
  parts: Record<Lang, PeriodPart[]>;
  /** The whole period as read, in each language. */
  text: Loc;
  /** No end month: the period runs to the present (COPY-resume.present). */
  current: boolean;
}
export interface ExperienceItem {
  role: Text;
  organization: Text;
  period: Period;
  /** The summary, one string per paragraph, per language (F-017 edge case: paragraph breaks are kept). */
  summary: Record<Lang, string[]>;
  highlights: Text[];
}
export interface EducationItem {
  program: Text;
  institution: Text;
  level?: Text;
  period: Period;
  notes: Record<Lang, string[]>;
}
export interface SkillItem {
  name: Text;
  /** COPY-resume.skillLevelShort, "3/5": only for a level below 5 (RULE-15). */
  levelShort?: Loc;
  /** COPY-resume.skillLevel, "3 out of 5": the same level in words. */
  levelText?: Loc;
}
export interface SkillGroup {
  /** The Owner's group label; absent for the skills without a group, which come last. */
  label?: Text;
  skills: SkillItem[];
}
export interface LanguageItem {
  name: Text;
  level: Text;
}
export interface CreditItem {
  /** A certificate's name or an award's title. */
  name: Text;
  issuer: Text;
  year: number;
}
export interface ResumeViewData {
  /** The sections that have entries, in RULE-15 order. */
  sections: ResumeSection[];
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  certificates: CreditItem[];
  awards: CreditItem[];
}

/** COPY-resume.<section>: each section's heading, in both languages. */
export const sectionTitle = (section: ResumeSection): Loc => tBoth(`COPY-resume.${section}`);

const START = '\u0001';
const END = '\u0002';

/** The paragraphs of each version of a text (ADR-0005: blank lines separate them). */
const paragraphsBoth = (text: Text | undefined): Record<Lang, string[]> =>
  Object.fromEntries(LANGUAGES.map((l) => [l, text === undefined ? [] : paragraphs(pick(text, l))])) as Record<
    Lang,
    string[]
  >;

/**
 * RULE-15: "June 2022 – present" / "tháng 6 năm 2022 – nay", in COPY-resume.period's order, with each month
 * machine-readable; months in each language's conventions (RULE-16, F-019.AC7).
 */
export function period(start: string, end?: string): Period {
  const parts = {} as Record<Lang, PeriodPart[]>;
  const text = {} as Loc;
  for (const lang of LANGUAGES) {
    const months: Record<string, PeriodPart> = {
      [START]: { text: formatMonth(start, lang), datetime: start },
      [END]: end
        ? { text: formatMonth(end, lang), datetime: end }
        : { text: t('COPY-resume.present', undefined, lang) },
    };
    parts[lang] = t('COPY-resume.period', { start: START, end: END }, lang)
      .split(new RegExp(`(${START}|${END})`))
      .filter(Boolean)
      .map((piece) => months[piece] ?? { text: piece });
    text[lang] = parts[lang].map((p) => p.text).join('');
  }
  return { parts, text, current: !end };
}

/** RULE-15: a level below 5 shows as "3/5" and in words; level 5 or no level shows the name only. */
export function skillItem(skill: { name: Text; level?: number }): SkillItem {
  if (skill.level === undefined || skill.level >= 5) return { name: skill.name };
  return {
    name: skill.name,
    levelShort: tBoth('COPY-resume.skillLevelShort', { level: skill.level }),
    levelText: tBoth('COPY-resume.skillLevel', { level: skill.level }),
  };
}

/**
 * RULE-15: groups in the order their first skill appears, skills in written order, ungrouped skills last. Two skills
 * share a group when their group labels are the same in both languages.
 */
export function skillGroups(skills: readonly { name: Text; group?: Text; level?: number }[]): SkillGroup[] {
  const groups = new Map<string, { label: Text; skills: SkillItem[] }>();
  const loose: SkillItem[] = [];
  for (const s of skills) {
    if (s.group === undefined) {
      loose.push(skillItem(s));
      continue;
    }
    const key = JSON.stringify(both(s.group));
    const group = groups.get(key) ?? { label: s.group, skills: [] };
    group.skills.push(skillItem(s));
    groups.set(key, group);
  }
  const out: SkillGroup[] = [...groups.values()];
  if (loose.length > 0) out.push({ skills: loose });
  return out;
}

export function resumeView(resume: Resume): ResumeViewData {
  const view: ResumeViewData = {
    sections: [],
    experience: (resume.experience ?? []).map((e) => ({
      role: e.role,
      organization: e.organization,
      period: period(e.start, e.end),
      summary: paragraphsBoth(e.summary),
      highlights: e.highlights ?? [],
    })),
    education: (resume.education ?? []).map((e) => ({
      program: e.program,
      institution: e.institution,
      level: e.level,
      period: period(e.start, e.end),
      notes: paragraphsBoth(e.notes),
    })),
    skills: skillGroups(resume.skills ?? []),
    languages: (resume.languages ?? []).map((l) => ({ name: l.name, level: l.level })),
    certificates: (resume.certificates ?? []).map((c) => ({ name: c.name, issuer: c.issuer, year: c.year })),
    awards: (resume.awards ?? []).map((a) => ({ name: a.title, issuer: a.issuer, year: a.year })),
  };
  view.sections = RESUME_SECTIONS.filter((s) => view[s].length > 0);
  return view;
}
