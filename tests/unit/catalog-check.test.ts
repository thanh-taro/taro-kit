// MOD-CatalogCheck (F-014, RULE-12). Every address points at a local HTTP server on 127.0.0.1:
// these tests never reach the internet. Classifier fixtures come from spike SP-2.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { loadRegistry, type Registry } from '../../src/modules/content/index.ts';
import {
  buildReport,
  checkReachability,
  classifyEmbedding,
  planCheck,
  runCheck,
  runCli,
  type Target,
} from '../../src/modules/catalog-check/index.ts';

const root = join(import.meta.dirname, '../..');
const PORTAL = 'https://tarokit.app';
const FAST = { timeoutMs: 1000 } as const; // generous for loaded CI machines; the hang test waits 2 attempts

// ---------- local server ----------
type Route = (req: IncomingMessage, res: ServerResponse, hit: number) => void;
const routes = new Map<string, Route>();
const hits = new Map<string, number>();
let server: Server;
let base = '';

const send =
  (status: number, headers: Record<string, string | string[]> = {}): Route =>
  (_q, res) => {
    res.writeHead(status, headers);
    res.end('x');
  };
routes.set('/ok', send(200));
routes.set('/not-found', send(404));
routes.set('/gone', send(410));
routes.set('/hang', () => {}); // never answers
routes.set('/flaky', (q, r, hit) => send(hit === 1 ? 500 : 200)(q, r, hit));
routes.set('/always-500', send(503));
routes.set('/fa-portal', send(200, { 'content-security-policy': `frame-ancestors ${PORTAL}` }));
routes.set('/fa-self', send(200, { 'content-security-policy': "default-src 'self'; frame-ancestors 'self'" }));
routes.set('/fa-site', send(200, { 'content-security-policy': 'frame-ancestors https://*.tarokit.app' }));
routes.set('/xfo-sameorigin', send(200, { 'x-frame-options': 'SAMEORIGIN' }));
routes.set('/xfo-deny', send(200, { 'x-frame-options': 'DENY' }));
routes.set('/xfo-allow-from', send(200, { 'x-frame-options': `ALLOW-FROM ${PORTAL}` }));
routes.set(
  '/fa-portal-and-xfo',
  send(200, { 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': `frame-ancestors 'self' ${PORTAL}` }),
);
routes.set('/report-only-none', send(200, { 'content-security-policy-report-only': "frame-ancestors 'none'" }));
routes.set('/redirect-to-deny', send(302, { location: '/xfo-deny' }));
routes.set('/deny-redirect-to-ok', send(302, { location: '/ok', 'x-frame-options': 'DENY' }));
for (let n = 1; n <= 6; n++) routes.set(`/chain/${n}`, send(302, { location: n === 1 ? '/ok' : `/chain/${n - 1}` }));

beforeAll(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const hit = (hits.get(path) ?? 0) + 1;
    hits.set(path, hit);
    const route = routes.get(path);
    if (route) route(req, res, hit);
    else send(404)(req, res, hit);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
});

const url = (path: string) => `${base}${path}`;
const tool = (id: string, path: string, embedded = false): Target => ({
  kind: 'tool',
  entryId: id,
  address: url(path),
  embedded,
});
const check = (targets: Target[]) => runCheck(targets, { ...FAST, portalOrigin: PORTAL });

/** A registry-shaped object for the CLI, with addresses on the local server. */
function registry(parts: {
  tools?: { id: string; path: string; embedded?: boolean; hidden?: boolean }[];
  projects?: { id: string; links: { label: string; path: string }[] }[];
  profileLinks?: { label: string; path?: string; url?: string }[];
}): Pick<Registry, 'allTools' | 'projects' | 'profile'> {
  return {
    allTools: (parts.tools ?? []).map((t) => ({
      id: t.id,
      url: url(t.path),
      openMode: t.embedded ? 'embedded' : 'linked',
      hidden: t.hidden ?? false,
    })),
    projects: (parts.projects ?? []).map((p) => ({
      id: p.id,
      links: p.links.map((l) => ({ label: l.label, url: url(l.path) })),
    })),
    profile: { links: (parts.profileLinks ?? []).map((l) => ({ label: l.label, url: l.url ?? url(l.path ?? '/ok') })) },
  } as unknown as Pick<Registry, 'allTools' | 'projects' | 'profile'>;
}

async function cli(argv: string[], reg: ReturnType<typeof registry>) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(argv, {
    root,
    env: {},
    out: (l) => out.push(l),
    err: (l) => err.push(l),
    load: () => reg,
    reach: FAST,
  });
  return { code, out, err, all: [...out, ...err].join('\n') };
}

// ---------- acceptance criteria ----------
describe('F-014 catalog check', () => {
  it('F014_AC1 fails on a visible tool that answers not found, naming the entry, address and status', async () => {
    const r = await cli([], registry({ tools: [{ id: 'dead-tool', path: '/not-found' }] }));
    expect(r.code).toBe(1);
    expect(r.err).toContain(`FAIL  tool dead-tool  ${url('/not-found')}  status 404`);
    expect(r.err.at(-1)).toMatch(/FAILED, 1 tool failure of 1 address checked/);
  });

  it('F014_AC1 RULE-12 does not retry after a 4xx', async () => {
    const [f] = await check([tool('gone', '/gone')]);
    expect(f.outcome).toBe('fail');
    expect(f.reach.attempts).toBe(1);
    expect(f.reason).toBe('status 410');
  });

  it('F014_AC2 fails with a timeout reason when the tool does not answer, even after one retry', async () => {
    const before = hits.get('/hang') ?? 0;
    const [f] = await check([tool('slow-tool', '/hang')]);
    expect(f.outcome).toBe('fail');
    expect(f.reach.reason).toBe('timeout');
    expect(f.reach.attempts).toBe(2);
    expect((hits.get('/hang') ?? 0) - before).toBe(2);
    expect(f.reason).toMatch(/^timeout: no answer within 1 s after 2 attempts$/);
    const report = buildReport([f], []);
    expect(report.lines[0]).toBe(`FAIL  tool slow-tool  ${url('/hang')}  ${f.reason}`);
    expect(report.exitCode).toBe(1);
  });

  it('F014_AC2 RULE-12 uses a 10 second limit per attempt and one retry by default', async () => {
    const { REACH_DEFAULTS } = await import('../../src/modules/catalog-check/index.ts');
    expect(REACH_DEFAULTS).toMatchObject({ timeoutMs: 10_000, retries: 1, maxRedirects: 5 });
  });

  it('RULE-12 retries once after a server error, and fails if it persists', async () => {
    const [flaky, down] = await check([tool('flaky', '/flaky'), tool('down', '/always-500')]);
    expect(flaky).toMatchObject({ outcome: 'pass' });
    expect(flaky.reach.attempts).toBe(2);
    expect(down.outcome).toBe('fail');
    expect(down.reason).toBe('status 503 after 2 attempts');
  });

  it('RULE-12 follows at most 5 redirects', async () => {
    const [five, six] = await check([tool('five', '/chain/5'), tool('six', '/chain/6')]);
    expect(five.outcome).toBe('pass');
    expect(five.reach.finalUrl).toBe(url('/ok'));
    expect(six.outcome).toBe('fail');
    expect(six.reason).toBe('more than 5 redirects');
  });

  it('RULE-12 reports a network error when nothing listens', async () => {
    const [f] = await runCheck([{ kind: 'tool', entryId: 'nobody', address: 'http://127.0.0.1:9/', embedded: false }], {
      ...FAST,
      portalOrigin: PORTAL,
    });
    expect(f.outcome).toBe('fail');
    expect(f.reason).toMatch(/^network error/);
  });

  it('F014_AC3 skips a hidden tool with a dead address', async () => {
    const before = hits.get('/not-found') ?? 0;
    const r = await cli(
      [],
      registry({
        tools: [
          { id: 'secret', path: '/not-found', hidden: true },
          { id: 'live', path: '/ok' },
        ],
      }),
    );
    expect(r.code).toBe(0);
    expect(hits.get('/not-found') ?? 0).toBe(before); // never fetched
    expect(r.out).toContain(`SKIP  tool secret  ${url('/not-found')}  hidden`);
    expect(r.out.at(-1)).toMatch(
      /passed, 1 address checked \(1 tool, 0 project links, 0 profile links\); 0 warnings, 1 skipped/,
    );
  });

  it('F014_AC3 plans only visible tools from real content (hidden fixture tool skipped)', () => {
    const reg = loadRegistry({ root, contentDir: join(root, 'tests/fixtures/content/valid') });
    const plan = planCheck(reg);
    expect(
      plan.targets
        .filter((t) => t.kind === 'tool')
        .map((t) => t.entryId)
        .sort(),
    ).toEqual(['excalidraw', 'json', 'units']);
    expect(plan.skipped).toContainEqual(expect.objectContaining({ kind: 'tool', entryId: 'secret', why: 'hidden' }));
    // Only embedded tools get the embedding check; external tools are always linked (RULE-07).
    expect(plan.targets.filter((t) => t.embedded).map((t) => t.entryId)).toEqual(['json']);
    // mailto: links cannot be fetched.
    expect(plan.skipped).toContainEqual(
      expect.objectContaining({ kind: 'profile', label: 'Email', why: 'not-a-web-address' }),
    );
  });

  it('F014_AC4 passes an embedded tool whose site declares no embedding restriction', async () => {
    const [plain, reportOnly] = await check([tool('plain', '/ok', true), tool('ro', '/report-only-none', true)]);
    expect(plain).toMatchObject({ outcome: 'pass', reason: '' });
    expect(reportOnly).toMatchObject({ outcome: 'pass' }); // Report-Only is ignored
  });

  it('F014_AC5 fails an embedded tool that allows embedding only by itself, naming the entry and reason', async () => {
    const r = await cli(
      [],
      registry({
        tools: [
          { id: 'self-only', path: '/fa-self', embedded: true },
          { id: 'sameorigin', path: '/xfo-sameorigin', embedded: true },
          { id: 'same-site', path: '/fa-site', embedded: true },
          { id: 'deny', path: '/xfo-deny', embedded: true },
        ],
      }),
    );
    expect(r.code).toBe(1);
    expect(r.err).toContain(
      `FAIL  tool self-only  ${url('/fa-self')}  not embeddable by ${PORTAL}: frame-ancestors "'self'" does not allow ${PORTAL}`,
    );
    expect(r.err).toContain(
      `FAIL  tool sameorigin  ${url('/xfo-sameorigin')}  not embeddable by ${PORTAL}: X-Frame-Options SAMEORIGIN allows only ${base}, not ${PORTAL}`,
    );
    // Allowing only the same site (subdomains of tarokit.app) is not enough: *. excludes the apex (RULE-12).
    expect(r.err.some((l) => l.startsWith(`FAIL  tool same-site  ${url('/fa-site')}  not embeddable`))).toBe(true);
    expect(r.err.some((l) => l.startsWith('FAIL  tool deny') && l.includes('X-Frame-Options DENY'))).toBe(true);
  });

  it('F014_AC5 judges the final response after redirects, not the hops', async () => {
    const [toDeny, fromDeny] = await check([
      tool('to-deny', '/redirect-to-deny', true),
      tool('from-deny', '/deny-redirect-to-ok', true),
    ]);
    expect(toDeny.outcome).toBe('fail');
    expect(fromDeny.outcome).toBe('pass');
  });

  it('F014_AC6 passes an embedded tool whose site explicitly allows the portal origin', async () => {
    const [fa, both] = await check([tool('allowed', '/fa-portal', true), tool('csp-wins', '/fa-portal-and-xfo', true)]);
    expect(fa).toMatchObject({ outcome: 'pass' });
    expect(both).toMatchObject({ outcome: 'pass' }); // frame-ancestors overrides X-Frame-Options
  });

  it('F014_AC7 passes and reports how many entries it checked when everything is reachable and embeddable', async () => {
    const r = await cli(
      [],
      registry({
        tools: [
          { id: 'a', path: '/ok', embedded: true },
          { id: 'b', path: '/fa-portal', embedded: true },
          { id: 'c', path: '/ok' },
        ],
        projects: [{ id: 'proj', links: [{ label: 'Live', path: '/ok' }] }],
        profileLinks: [{ label: 'Site', path: '/ok' }],
      }),
    );
    expect(r.code).toBe(0);
    expect(r.err).toEqual([]);
    expect(r.out.at(-1)).toBe(
      'catalog check (pre-publish): passed, 5 addresses checked (3 tools, 1 project link, 1 profile link); 0 warnings',
    );
  });

  it('F014_AC7 --json reports the same result as data', async () => {
    const r = await cli(['--json'], registry({ tools: [{ id: 'a', path: '/ok', embedded: true }] }));
    const data = JSON.parse(r.out.join('\n'));
    expect(data).toMatchObject({
      passed: true,
      checked: 1,
      failures: 0,
      entries: [{ id: 'a', outcome: 'pass', status: 200 }],
    });
  });

  it('F014_AC8 warns about a project with a dead link and does not block publishing', async () => {
    const r = await cli(
      [],
      registry({
        tools: [{ id: 'a', path: '/ok' }],
        projects: [{ id: 'old-blog', links: [{ label: 'Source', path: '/not-found' }] }],
      }),
    );
    expect(r.code).toBe(0);
    expect(r.out).toContain(`WARN  project old-blog link "Source"  ${url('/not-found')}  status 404`);
    expect(r.out.at(-1)).toMatch(/passed, 2 addresses checked .*; 1 warning$/);
  });

  it('F014_AC10 warns about a profile link that answers not found and does not block publishing', async () => {
    const r = await cli([], registry({ profileLinks: [{ label: 'GitHub', path: '/not-found' }] }));
    expect(r.code).toBe(0);
    expect(r.out).toContain(`WARN  profile link "GitHub"  ${url('/not-found')}  status 404`);
  });

  it('F014_AC9 marks the weekly run failed when a tool has gone down', async () => {
    const r = await cli(['--weekly'], registry({ tools: [{ id: 'went-down', path: '/always-500' }] }));
    expect(r.code).toBe(1); // a non-zero exit fails the workflow run, and GitHub emails the Owner (ADR-0007)
    expect(r.err.at(-1)).toMatch(/^catalog check \(weekly\): FAILED/);
    expect(r.err).toContain(`FAIL  tool went-down  ${url('/always-500')}  status 503 after 2 attempts`);
  });

  it('F014_AC9 the weekly workflow checks main, fails the run on failure, and never deploys', () => {
    const wf = parse(readFileSync(join(root, '.github/workflows/catalog-check.yml'), 'utf8'));
    expect(wf.on.schedule?.[0]?.cron).toMatch(/^\S+ \S+ \* \* \S+$/); // weekly
    expect(wf.permissions).toEqual({ contents: 'read' }); // cannot change the live portal
    const weekly = wf.jobs.weekly;
    const text = JSON.stringify(weekly.steps);
    expect(weekly.steps.find((s: { uses?: string }) => s.uses?.startsWith('actions/checkout')).with.ref).toBe('main');
    const step = weekly.steps.find((s: { run?: string }) => s.run?.includes('catalog:check'));
    expect(step.run.trim()).toBe('pnpm catalog:check --weekly');
    expect(step['continue-on-error']).toBeUndefined();
    expect(weekly['continue-on-error']).toBeUndefined();
    expect(text).not.toMatch(/wrangler|deploy|secrets\./i);
    // The pre-publish job blocks: a failing check fails the job a deploy would need.
    // Reusable-workflow trap: github.event_name is the caller's event, so the modes key off an input.
    expect(wf.on.workflow_call.inputs.pre_deploy).toMatchObject({ type: 'boolean', default: true });
    expect(weekly.if).toBe('${{ !inputs.pre_deploy }}');
    expect(wf.jobs['pre-deploy'].if).toBe('${{ inputs.pre_deploy }}');
    const pre = wf.jobs['pre-deploy'];
    expect(pre.steps.find((s: { run?: string }) => s.run?.includes('catalog:check')).run.trim()).toBe(
      'pnpm catalog:check',
    );
  });

  it('F014_AC9 the CLI writes the summary to the CI job summary', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tarokit-cc-'));
    const file = join(dir, 'summary.md');
    try {
      const code = await runCli(['--weekly'], {
        root,
        env: { GITHUB_STEP_SUMMARY: file, GITHUB_ACTIONS: 'true' },
        out: () => {},
        err: () => {},
        load: () => registry({ tools: [{ id: 'down', path: '/not-found' }] }),
        reach: FAST,
      });
      expect(code).toBe(1);
      const md = readFileSync(file, 'utf8');
      expect(md).toMatch(/^### Failed: catalog check \(weekly\): FAILED/);
      expect(md).toContain(`FAIL  tool down  ${url('/not-found')}  status 404`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('MOD-CatalogCheck exits 2 on unknown arguments', async () => {
    const r = await cli(['--nope'], registry({}));
    expect(r.code).toBe(2);
    expect(r.err[0]).toMatch(/unknown argument "--nope"/);
  });

  it('MOD-CatalogCheck --portal-origin changes the origin embedding is judged against', async () => {
    const reg = registry({ tools: [{ id: 'a', path: '/fa-portal', embedded: true }] });
    expect((await cli(['--portal-origin', 'https://staging.example'], reg)).code).toBe(1);
    expect((await cli(['--portal-origin=https://tarokit.app'], reg)).code).toBe(0);
  });

  it('MOD-CatalogCheck sends an identifying User-Agent', async () => {
    let ua = '';
    routes.set('/ua', (q, res) => {
      ua = String(q.headers['user-agent']);
      res.end();
    });
    expect((await checkReachability(url('/ua'), FAST)).ok).toBe(true);
    expect(ua).toMatch(/^TaroKit-CatalogCheck\//);
  });
});

// ---------- classifier: SP-2 fixture table ----------
describe('RULE-12 classifyEmbedding (SP-2 fixtures, browser-verified)', () => {
  const P = 'https://portal.localhost:47820';
  const T = 'https://tool.localhost:47820';
  const cases: [string, Record<string, string | string[]>, boolean][] = [
    ['g1 no headers', {}, true],
    ['g2 frame-ancestors portal', { 'content-security-policy': `frame-ancestors ${P}` }, true],
    [
      'g3 XFO SAMEORIGIN + CSP allows portal',
      { 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': `default-src 'self'; frame-ancestors 'self' ${P}` },
      true,
    ],
    ['g5 Report-Only none only', { 'content-security-policy-report-only': "frame-ancestors 'none'" }, true],
    ['b1 XFO DENY', { 'x-frame-options': 'DENY' }, false],
    ['b2 XFO SAMEORIGIN', { 'x-frame-options': 'SAMEORIGIN' }, false],
    ["b3 frame-ancestors 'self'", { 'content-security-policy': "frame-ancestors 'self'" }, false],
    [
      'b4 two CSPs: portal + none',
      { 'content-security-policy': [`frame-ancestors ${P}`, "frame-ancestors 'none'"] },
      false,
    ],
    [
      'b5 *.portal.localhost excludes apex',
      { 'content-security-policy': 'frame-ancestors https://*.portal.localhost:47820' },
      false,
    ],
    ['x1 XFO ALLOW-FROM ignored', { 'x-frame-options': `ALLOW-FROM ${P}` }, true],
    ['x2 XFO DENY, SAMEORIGIN conflicting', { 'x-frame-options': 'DENY, SAMEORIGIN' }, false],
    ['x3 XFO SAMEORIGIN twice', { 'x-frame-options': ['SAMEORIGIN', 'SAMEORIGIN'] }, false],
    [
      'x4 XFO DENY + Report-Only *',
      { 'x-frame-options': 'DENY', 'content-security-policy-report-only': 'frame-ancestors *' },
      false,
    ],
    [
      'x5 XFO DENY + CSP without fa + CSP with fa portal',
      { 'x-frame-options': 'DENY', 'content-security-policy': ['default-src *', `frame-ancestors ${P}`] },
      true,
    ],
    ['x8 portal host without port', { 'content-security-policy': 'frame-ancestors https://portal.localhost' }, false],
    ['x9 frame-ancestors *', { 'content-security-policy': 'frame-ancestors *' }, true],
    ['x10 scheme-only', { 'content-security-policy': 'frame-ancestors https:' }, true],
    ['x11 host:* without scheme', { 'content-security-policy': 'frame-ancestors portal.localhost:*' }, true],
    ["x12 'none' with other sources", { 'content-security-policy': `frame-ancestors 'none' ${P}` }, true],
    [
      'duplicate directive: first wins',
      { 'content-security-policy': `frame-ancestors 'none'; frame-ancestors ${P}` },
      false,
    ],
    [
      'http source matches https portal',
      { 'content-security-policy': 'frame-ancestors http://portal.localhost:47820' },
      true,
    ],
  ];
  for (const [name, headers, expected] of cases) {
    it(`RULE-12 ${name} -> ${expected ? 'embeddable' : 'blocked'}`, () => {
      expect(classifyEmbedding(headers, P, T).embeddable).toBe(expected);
      expect(
        classifyEmbedding(
          new Headers(
            Object.entries(headers).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])) as [
              string,
              string,
            ][],
          ),
          P,
          T,
        ).embeddable,
      ).toBe(expected);
    });
  }

  it('RULE-12 the tool-contract header admits https://tarokit.app; SAMEORIGIN on a sibling subdomain does not', () => {
    const tool = 'https://json-formatter.tarokit.app';
    expect(
      classifyEmbedding({ 'content-security-policy': 'frame-ancestors https://tarokit.app' }, PORTAL, tool),
    ).toMatchObject({ embeddable: true });
    expect(classifyEmbedding({ 'x-frame-options': 'SAMEORIGIN' }, PORTAL, tool)).toMatchObject({
      embeddable: false,
      reason: 'xfo-sameorigin-cross-origin',
    });
  });

  it('MOD-CatalogCheck reports an unrecognized X-Frame-Options value as a warning, not a failure', async () => {
    const [f] = await check([tool('allow-from', '/xfo-allow-from', true)]);
    expect(f.outcome).toBe('pass');
    expect(f.notes[0]).toMatch(/not a recognized value/);
    expect(buildReport([f], []).lines).toContain(`WARN  tool allow-from  ${url('/xfo-allow-from')}  ${f.notes[0]}`);
  });
});
