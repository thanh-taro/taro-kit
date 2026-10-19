// MOD-CatalogCheck public surface (specs/40-technical/modules/MOD-CatalogCheck.md). Node only; never bundled.
export {
  classifyEmbedding,
  parseCsp,
  readHeader,
  sourceMatches,
  type EmbedReason,
  type EmbedVerdict,
  type HeaderSource,
} from './classify.ts';
export { checkReachability, REACH_DEFAULTS, type ReachOptions, type ReachReason, type ReachResult } from './reach.ts';
export {
  buildReport,
  planCheck,
  reachReason,
  reportMarkdown,
  runCheck,
  type CheckOptions,
  type Finding,
  type Outcome,
  type Plan,
  type Report,
  type Skipped,
  type Target,
  type TargetKind,
} from './check.ts';
export { parseArgs, runCli, type CliDeps, type CliArgs } from './cli.ts';
