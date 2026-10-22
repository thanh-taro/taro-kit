// MOD-Pages: SCR-Policy data, built at build time from the registry's privacy policy or terms of use (F-018). Pure.
// The date is an absolute calendar date, so it is formatted once at build, in the full format SCR-Now reads its
// date with ("October 22, 2026"); the section blocks come from MOD-Content's `policyBlocks`.
// Implements: F-018.R1, F-018.R2.
import type { Policy, PolicySection } from '../../content/policy.ts';
import { t } from '../../copy/index.ts';
import { around, dateText, type Around } from '../now/now.ts';

export interface PolicyViewData {
  title: string;
  /** The last updated date, YYYY-MM-DD, for `<time datetime>` (platform-mapping). */
  updated: string;
  /** The same date in full: "October 22, 2026" (SCR-Policy). */
  updatedText: string;
  /** COPY-policy.updated around {date}. */
  updatedLabel: Around;
  sections: PolicySection[];
}

export function policyView(policy: Policy): PolicyViewData {
  return {
    title: policy.title,
    updated: policy.updated,
    updatedText: dateText(policy.updated).full,
    updatedLabel: around(t('COPY-policy.updated', { date: '\u0000' })),
    sections: policy.sections,
  };
}
