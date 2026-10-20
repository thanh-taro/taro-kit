// MOD-CatalogCheck CLI core: `pnpm catalog:check [--weekly] [--json] [--portal-origin <origin>]`.
// Implements: F-014.R3 (per-entry report and summary), F-014.R5 (`--weekly` labels the scheduled run; the
// same exit code fails it). Exit codes: 0 = nothing blocks publishing (warnings allowed), 1 = a tool failed,
// 2 = the check could not run (bad arguments or invalid content).
import { appendFileSync } from 'node:fs';
import { ContentErrors, loadRegistry, PORTAL_ORIGIN, type Registry } from '../content/index.ts';
import { buildReport, planCheck, reportMarkdown, runCheck, type Finding, type Report } from './check.ts';
import type { ReachOptions } from './reach.ts';

export interface CliArgs {
  weekly: boolean;
  json: boolean;
  portalOrigin: string;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { weekly: false, json: false, portalOrigin: PORTAL_ORIGIN };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--')
      continue; // pnpm passes a separator through
    else if (a === '--weekly') args.weekly = true;
    else if (a === '--json') args.json = true;
    else if (a === '--portal-origin' || a.startsWith('--portal-origin=')) {
      const v = a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[++i];
      if (!v) throw new Error('--portal-origin needs an origin, e.g. https://tarokit.app');
      args.portalOrigin = new URL(v).origin;
    } else throw new Error(`unknown argument "${a}" (use --weekly, --json, --portal-origin <origin>)`);
  }
  return args;
}

export interface CliDeps {
  root: string;
  env: Record<string, string | undefined>;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Content loading; tests inject a registry here. */
  load?: (root: string) => Pick<Registry, 'allTools' | 'profile'>;
  /** Reach options, plus the `allowHttp` test hook (CheckOptions). */
  reach?: ReachOptions & { allowHttp?: boolean };
  /** Test hook: replaces `runCheck` (to prove a crash exits 2). */
  run?: typeof runCheck;
}

/** Escapes a workflow-command message the way @actions/core does (`%`, CR, LF). */
export const escapeAnnotation = (s: string): string =>
  s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');

export async function runCli(argv: readonly string[], deps: CliDeps): Promise<0 | 1 | 2> {
  let args: CliArgs;
  let registry: Pick<Registry, 'allTools' | 'profile'>;
  try {
    args = parseArgs(argv);
    registry = (deps.load ?? ((root) => loadRegistry({ root })))(deps.root);
  } catch (e) {
    deps.err(`catalog check: could not run: ${e instanceof ContentErrors ? e.message : (e as Error).message}`);
    return 2;
  }
  // A crash is "could not run" (2), never mistaken for a tool failure (1).
  let plan: ReturnType<typeof planCheck>;
  let findings: Finding[];
  let report: Report;
  try {
    plan = planCheck(registry);
    findings = await (deps.run ?? runCheck)(plan.targets, { ...deps.reach, portalOrigin: args.portalOrigin });
    report = buildReport(findings, plan.skipped, args.weekly);
  } catch (e) {
    deps.err(`catalog check: could not run: ${(e as Error)?.stack ?? String(e)}`);
    return 2;
  }

  if (args.json) {
    deps.out(
      JSON.stringify(
        {
          label: report.label,
          passed: report.passed,
          checked: report.checked,
          counts: report.counts,
          failures: report.failures,
          warnings: report.warnings,
          summary: report.summary,
          entries: findings.map((f) => ({
            kind: f.target.kind,
            id: f.target.entryId,
            label: f.target.label,
            address: f.target.address,
            outcome: f.outcome,
            reason: f.reason || undefined,
            notes: f.notes.length ? f.notes : undefined,
            status: f.reach.status,
            finalUrl: f.reach.finalUrl,
            attempts: f.reach.attempts,
          })),
          skipped: plan.skipped,
        },
        null,
        2,
      ),
    );
  } else {
    for (const l of report.lines) (l.startsWith('FAIL') ? deps.err : deps.out)(l);
    (report.passed ? deps.out : deps.err)(report.summary);
  }
  // GitHub Actions: failures and warnings become annotations, and the summary goes to the job summary.
  if (deps.env.GITHUB_ACTIONS === 'true') {
    for (const l of report.lines) {
      if (l.startsWith('FAIL')) deps.err(`::error title=Catalog check::${escapeAnnotation(l.slice(6))}`);
      else if (l.startsWith('WARN')) deps.err(`::warning title=Catalog check::${escapeAnnotation(l.slice(6))}`);
    }
  }
  if (deps.env.GITHUB_STEP_SUMMARY) appendFileSync(deps.env.GITHUB_STEP_SUMMARY, reportMarkdown(report));
  return report.exitCode;
}
