// MOD-Pages: SCR-Policy data, built at build time from the registry's privacy policy or terms of use (F-018). Pure.
// The date is an absolute calendar date, so it is formatted once at build, in the full format SCR-Now reads its
// date with ("October 22, 2026", "22 tháng 10, 2026"); the section blocks come from MOD-Content's `policyBlocks`, one
// set per language. With Vietnamese showing a translation note follows the date (F-019.R6, D-063).
// Implements: F-018.R1, F-018.R2, F-019.R6.
import type { Policy, PolicySection } from '../../content/policy.ts';
import { t } from '../../copy/index.ts';
import type { Loc } from '../../language/languages.ts';
import { copyAround, dateText, type LocAround } from '../now/now.ts';

export interface PolicyViewData {
  title: Loc;
  /** The last updated date, YYYY-MM-DD, for `<time datetime>` (platform-mapping). */
  updated: string;
  /** The same date in full: "October 22, 2026" / "22 tháng 10, 2026" (SCR-Policy). */
  updatedText: Loc;
  /** COPY-policy.updated around {date}. */
  updatedLabel: LocAround;
  sections: PolicySection[];
  /** COPY-policy.translationNote: shown only while Vietnamese shows (F-019.R6), so only its vi-VN text. */
  translationNote: string;
}

export function policyView(policy: Policy): PolicyViewData {
  return {
    title: policy.title,
    updated: policy.updated,
    updatedText: dateText(policy.updated).full,
    updatedLabel: copyAround('COPY-policy.updated', 'date'),
    sections: policy.sections,
    translationNote: t('COPY-policy.translationNote', undefined, 'vi-VN'),
  };
}
