// MOD-CatalogCheck: what to check, running the checks, and the report.
// Implements: F-014.R1 (visible tools reachable, blocking), F-014.R2 (embedded tools embeddable, blocking),
// F-014.R3 (failures name entry, address and reason; a pass gives the count), F-014.R4 (project and
// profile links are warnings only), F-014.R5 (the weekly run uses the same check; exit code fails the run).
import type { Registry } from '../content/index.ts';
import { classifyEmbedding } from './classify.ts';
import { checkReachability, type ReachOptions, type ReachResult } from './reach.ts';

export type TargetKind = 'tool' | 'project' | 'profile';

export interface Target {
  kind: TargetKind;
  /** The catalog entry id (tool or project), or "profile". */
  entryId: string;
  /** The link's label, for project and profile links. */
  label?: string;
  address: string;
  /** Embedded tools also get the embedding check (RULE-12). */
  embedded: boolean;
}

export interface Skipped {
  kind: TargetKind;
  entryId: string;
  label?: string;
  address: string;
  why: 'hidden' | 'not-a-web-address';
}

export interface Plan {
  targets: Target[];
  skipped: Skipped[];
}

const isWebAddress = (address: string): boolean => /^https?:\/\//i.test(address);

/**
 * Visible tools, visible projects' links and the profile's links. Hidden tools are skipped (F-014.AC3);
 * hidden projects are already absent from `registry.projects`. Links that are not web addresses
 * (mailto:, for example) cannot be fetched and are listed as skipped.
 */
export function planCheck(registry: Pick<Registry, 'allTools' | 'projects' | 'profile'>): Plan {
  const targets: Target[] = [];
  const skipped: Skipped[] = [];
  for (const t of registry.allTools) {
    if (t.hidden) skipped.push({ kind: 'tool', entryId: t.id, address: t.url, why: 'hidden' });
    else targets.push({ kind: 'tool', entryId: t.id, address: t.url, embedded: t.openMode === 'embedded' });
  }
  const links = (kind: TargetKind, entryId: string, list: readonly { label: string; url: string }[]) => {
    for (const l of list) {
      if (isWebAddress(l.url)) targets.push({ kind, entryId, label: l.label, address: l.url, embedded: false });
      else skipped.push({ kind, entryId, label: l.label, address: l.url, why: 'not-a-web-address' });
    }
  };
  for (const p of registry.projects) links('project', p.id, p.links);
  links('profile', 'profile', registry.profile.links ?? []);
  return { targets, skipped };
}

export type Outcome = 'pass' | 'fail' | 'warn';

export interface Finding {
  target: Target;
  outcome: Outcome;
  /** Why it failed or warned; empty on a pass. */
  reason: string;
  /** Non-blocking notes on a passing entry (e.g. an unrecognized X-Frame-Options value). */
  notes: string[];
  reach: ReachResult;
}

export interface CheckOptions extends ReachOptions {
  portalOrigin: string;
  /**
   * Test hook only (the CLI never sets it): accept a final address that is http, so unit tests can use a
   * local plain-HTTP server. In production every final address must be https (INV-02).
   */
  allowHttp?: boolean;
  /** Checks running at once. */
  concurrency?: number;
}

/** The reason text for an unreachable address (F-014.R3). */
export function reachReason(r: ReachResult, timeoutMs: number): string {
  const tries = r.attempts > 1 ? ` after ${r.attempts} attempts` : '';
  switch (r.reason) {
    case 'status':
      return `status ${r.status}${tries}`;
    case 'timeout':
      return `timeout: no answer within ${timeoutMs / 1000} s${tries}`;
    case 'too-many-redirects':
      return 'more than 5 redirects';
    case 'unsupported-redirect':
      return `unsupported-redirect: redirected to ${r.finalUrl.split(':')[0]}:, which is not a web address`;
    case 'network-error':
      return `network error${r.error ? ` (${r.error})` : ''}${tries}`;
    default:
      return r.reason;
  }
}

async function checkOne(target: Target, opts: CheckOptions): Promise<Finding> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const reach = await checkReachability(target.address, opts);
  const blocking = target.kind === 'tool';
  if (!reach.ok) {
    return { target, outcome: blocking ? 'fail' : 'warn', reason: reachReason(reach, timeoutMs), notes: [], reach };
  }
  // A secure address that ends on an insecure one breaks INV-02 (F-014 edge case): tools fail, links warn.
  if (!opts.allowHttp && new URL(reach.finalUrl).protocol !== 'https:') {
    const reason = `insecure-redirect: the final address ${reach.finalUrl} is not https`;
    return { target, outcome: blocking ? 'fail' : 'warn', reason, notes: [], reach };
  }
  if (!target.embedded) return { target, outcome: 'pass', reason: '', notes: [], reach };
  const verdict = classifyEmbedding(reach.headers ?? new Headers(), opts.portalOrigin, new URL(reach.finalUrl).origin);
  if (!verdict.embeddable) {
    return {
      target,
      outcome: 'fail',
      reason: `not embeddable by ${new URL(opts.portalOrigin).origin}: ${verdict.detail ?? verdict.reason}`,
      notes: verdict.warnings,
      reach,
    };
  }
  return { target, outcome: 'pass', reason: '', notes: verdict.warnings, reach };
}

/** Runs every target with bounded concurrency; findings keep the plan's order. */
export async function runCheck(targets: readonly Target[], opts: CheckOptions): Promise<Finding[]> {
  const out: Finding[] = new Array(targets.length);
  let next = 0;
  const worker = async () => {
    while (next < targets.length) {
      const i = next++;
      out[i] = await checkOne(targets[i], opts);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 6, targets.length) }, worker));
  return out;
}

// ---------- report ----------

export interface Report {
  passed: boolean;
  /** 0 when nothing blocks publishing, 1 on any tool failure. */
  exitCode: 0 | 1;
  label: 'pre-publish' | 'weekly';
  checked: number;
  counts: Record<TargetKind, number>;
  failures: number;
  warnings: number;
  lines: string[];
  summary: string;
}

/** One line per finding: newlines in a content-authored label never split a report line. */
const oneLine = (s: string | undefined): string => (s ?? '').replace(/[\r\n]+/g, ' ');

const who = (t: { kind: TargetKind; entryId: string; label?: string }): string =>
  t.kind === 'tool'
    ? `tool ${t.entryId}`
    : t.kind === 'project'
      ? `project ${t.entryId} link "${oneLine(t.label)}"`
      : `profile link "${oneLine(t.label)}"`;

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : one.endsWith('s') ? 'es' : 's'}`;

export function buildReport(findings: readonly Finding[], skipped: readonly Skipped[], weekly = false): Report {
  const counts: Record<TargetKind, number> = { tool: 0, project: 0, profile: 0 };
  for (const f of findings) counts[f.target.kind]++;
  const failures = findings.filter((f) => f.outcome === 'fail').length;
  const warnings =
    findings.filter((f) => f.outcome === 'warn').length + findings.reduce((n, f) => n + f.notes.length, 0);
  const lines: string[] = [];
  for (const f of findings) {
    const tag = f.outcome === 'pass' ? 'PASS' : f.outcome === 'fail' ? 'FAIL' : 'WARN';
    lines.push(`${tag}  ${who(f.target)}  ${f.target.address}${f.reason ? `  ${f.reason}` : ''}`);
    for (const n of f.notes) lines.push(`WARN  ${who(f.target)}  ${f.target.address}  ${n}`);
  }
  for (const s of skipped) {
    lines.push(`SKIP  ${who(s)}  ${s.address}  ${s.why === 'hidden' ? 'hidden' : 'not a web address'}`);
  }
  const label = weekly ? 'weekly' : 'pre-publish';
  const passed = failures === 0;
  const checked = findings.length;
  const breakdown = `${plural(counts.tool, 'tool')}, ${plural(counts.project, 'project link')}, ${plural(counts.profile, 'profile link')}`;
  const tail = `${plural(warnings, 'warning')}${skipped.length ? `, ${skipped.length} skipped` : ''}`;
  const summary = passed
    ? `catalog check (${label}): passed, ${plural(checked, 'address')} checked (${breakdown}); ${tail}`
    : `catalog check (${label}): FAILED, ${plural(failures, 'tool failure')} of ${plural(checked, 'address')} checked (${breakdown}); ${tail}`;
  return { passed, exitCode: passed ? 0 : 1, label, checked, counts, failures, warnings, lines, summary };
}

/** The same summary as Markdown, for the CI job summary (MOD-CatalogCheck output). */
export function reportMarkdown(r: Report): string {
  const rows = r.lines.filter((l) => !l.startsWith('PASS')).map((l) => `- \`${l.replace(/`/g, "'")}\``);
  return [`### ${r.passed ? 'Passed' : 'Failed'}: ${r.summary}`, '', ...rows, ''].join('\n');
}
