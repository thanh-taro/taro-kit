// MOD-Content: load -> validate (schema + invariants) -> normalize -> derive (ADR-0005).
// Runs in Node at build (Astro config, pages, scripts). Never runs in the browser.
// Implements: F-001.R1, F-001.R2, F-001.R3, F-001.R4, F-001.R5.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LineCounter, parseDocument } from 'yaml';
import type { Category, EntryBase, NowNote, Profile, Project, Tool } from '../../generated/domain.ts';
import { type ContentError, ContentErrors } from './errors.ts';
import { type Def, defaultSchemaPath, mapAjvError, validatorFor } from './schema.ts';

/** The portal's own origin (ADR-0001, D-025). */
export const PORTAL_ORIGIN = 'https://tarokit.app';

// ---------- normalized registry types (strict, unlike the generated ones; ADR-0005) ----------
type Permission = NonNullable<Tool['permissions']>[number];
/** json-schema-to-typescript drops `allOf` beside sibling keywords, so the entry base is composed here. */
export type RawTool = EntryBase & Tool;
export type RawProject = EntryBase & Project;

export interface RegTool extends Omit<RawTool, 'openMode' | 'permissions' | 'offline' | 'hidden' | 'tags'> {
  openMode: 'embedded' | 'linked';
  permissions: Permission[];
  offline: boolean;
  hidden: boolean;
  tags: string[];
  file: string;
}
export interface RegProject extends Omit<RawProject, 'hidden' | 'tags'> {
  hidden: boolean;
  tags: string[];
  file: string;
}
export interface RegCategory extends Category {
  /** Visible tools in this category, sorted by name. */
  tools: RegTool[];
}
export interface ChangelogEvent {
  date: string;
  type: 'added' | 'updated';
  kind: 'tool' | 'project';
  id: string;
  name: string;
}
export interface Registry {
  /** Every tool, hidden ones included. For checks only (RULE-06). */
  allTools: RegTool[];
  visibleTools: RegTool[];
  toolById(id: string): RegTool | undefined;
  /** Categories with at least one visible tool, in display order (RULE-06). */
  categories: RegCategory[];
  /** Visible projects, newest year first, then by name. */
  projects: RegProject[];
  profile: Profile;
  now: NowNote;
  changelogEvents: ChangelogEvent[];
  embeddedOrigins: string[];
  portalOrigin: string;
}

export interface LoadOptions {
  /** Repo root: holds specs/ (default: process.cwd()). */
  root?: string;
  /** Content folder (default: <root>/content, or $TAROKIT_CONTENT_DIR). */
  contentDir?: string;
  /** Domain schema file (default: <root>/specs/10-domain/project.schema.json). */
  schemaPath?: string;
  portalOrigin?: string;
}

// ---------- loading ----------
interface Loaded {
  file: string;
  data: unknown;
  lineOf: (path: (string | number)[]) => number | undefined;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const idOf = (v: unknown): string => (isObj(v) && typeof v.id === 'string' && v.id ? v.id : '-');

function loadYaml(relRoot: string, abs: string, errors: ContentError[]): Loaded {
  const file = relative(relRoot, abs);
  const lc = new LineCounter();
  const doc = parseDocument(readFileSync(abs, 'utf8'), { lineCounter: lc, prettyErrors: false });
  for (const e of doc.errors)
    errors.push({ file, line: e.linePos?.[0]?.line, entryId: '-', rule: 'YAML', message: e.message.split('\n')[0] });
  const lineOf = (path: (string | number)[]) => {
    for (let p = path; ; p = p.slice(0, -1)) {
      const node = (p.length ? doc.getIn(p, true) : doc.contents) as { range?: [number, number, number] } | null;
      if (node?.range) return lc.linePos(node.range[0]).line;
      if (!p.length) return undefined;
    }
  };
  return { file, data: doc.toJS(), lineOf };
}

const listYaml = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.yaml'))
        .sort()
        .map((f) => join(dir, f))
    : [];

// ---------- main ----------
export function loadRegistry(opts: LoadOptions = {}): Registry {
  const root = opts.root ?? process.cwd();
  const contentDir = opts.contentDir ?? process.env.TAROKIT_CONTENT_DIR ?? join(root, 'content');
  const schemaPath = opts.schemaPath ?? defaultSchemaPath(root);
  const portalOrigin = opts.portalOrigin ?? process.env.TAROKIT_PORTAL_ORIGIN ?? PORTAL_ORIGIN;
  const relRoot = join(contentDir, '..'); // errors read "content/tools/x.yaml" wherever the folder lives
  const errors: ContentError[] = [];
  const load = (abs: string) => loadYaml(relRoot, abs, errors);
  const required = (name: string): Loaded => {
    const abs = join(contentDir, name);
    if (existsSync(abs)) return load(abs);
    errors.push({ file: relative(relRoot, abs), entryId: '-', rule: 'SCHEMA', message: 'file is missing' });
    return { file: relative(relRoot, abs), data: undefined, lineOf: () => undefined };
  };

  const toolFiles = listYaml(join(contentDir, 'tools')).map(load);
  const projectFiles = listYaml(join(contentDir, 'projects')).map(load);
  const catFile = required('categories.yaml');
  const profileFile = required('profile.yaml');
  const nowFile = required('now.yaml');

  // 1. Schema (F-001.R2). Each file is checked against its $defs entry of the domain schema.
  const schemaCheck = (l: Loaded, def: Def, prefix: (string | number)[] = []) => {
    if (l.data === undefined) return;
    const target = prefix.reduce<unknown>((o, k) => (o as Obj | undefined)?.[k as string], l.data);
    const validate = validatorFor(schemaPath, def);
    if (validate(target)) return;
    const seen = new Set<string>();
    for (const err of validate.errors ?? []) {
      const m = mapAjvError(err, isObj(target) ? target : undefined);
      if (!m) continue;
      const key = `${m.rule}|${m.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      errors.push({
        file: l.file,
        line: l.lineOf([...prefix, ...m.path]),
        entryId: idOf(target),
        rule: m.rule,
        message: m.message,
      });
    }
  };
  toolFiles.forEach((l) => schemaCheck(l, 'tool'));
  projectFiles.forEach((l) => schemaCheck(l, 'project'));
  const catList: unknown[] = Array.isArray(catFile.data) ? catFile.data : [];
  if (catFile.data !== undefined && !Array.isArray(catFile.data))
    errors.push({ file: catFile.file, entryId: '-', rule: 'SCHEMA', message: 'must be a list of categories' });
  catList.forEach((_, i) => schemaCheck(catFile, 'category', [i]));
  schemaCheck(profileFile, 'profile');
  schemaCheck(nowFile, 'nowNote');

  // 2. Invariants the schema cannot express (ADR-0005).
  const entries = [...toolFiles, ...projectFiles].filter((l) => idOf(l.data) !== '-');

  // INV-01: ids are unique across tools and projects. Both entries are named (F-001.AC2).
  const byId = new Map<string, Loaded[]>();
  for (const l of entries) byId.set(idOf(l.data), [...(byId.get(idOf(l.data)) ?? []), l]);
  for (const [id, ls] of byId) {
    if (ls.length < 2) continue;
    for (const l of ls) {
      const others = ls.filter((o) => o !== l).map((o) => o.file);
      errors.push({
        file: l.file,
        line: l.lineOf(['id']),
        entryId: id,
        rule: 'INV-01',
        message: `duplicate id "${id}"; also used by ${others.join(', ')}`,
      });
    }
  }

  for (const l of entries) {
    const d = l.data as Obj;
    // INV-06: updated on or after added (F-001.AC8).
    if (typeof d.added === 'string' && typeof d.updated === 'string' && d.updated < d.added)
      errors.push({
        file: l.file,
        line: l.lineOf(['updated']),
        entryId: idOf(d),
        rule: 'INV-06',
        message: `updated ${d.updated} is before added ${d.added}`,
      });
    // Bundled assets exist (ADR-0005).
    for (const key of ['icon', 'image'])
      if (typeof d[key] === 'string' && !existsSync(join(contentDir, 'assets', d[key].replace(/^\//, ''))))
        errors.push({
          file: l.file,
          line: l.lineOf([key]),
          entryId: idOf(d),
          rule: 'ASSET',
          message: `${key} "${d[key]}" not found in content/assets/`,
        });
  }

  // INV-07: category ids are unique; RULE-14: no two categories share a tint (F-001.AC9).
  const catIds = new Set<string>();
  const tintOwners = new Map<string, { id: string; i: number }[]>();
  catList.forEach((c, i) => {
    if (!isObj(c)) return;
    const id = idOf(c);
    if (catIds.has(id))
      errors.push({
        file: catFile.file,
        line: catFile.lineOf([i, 'id']),
        entryId: id,
        rule: 'INV-07',
        message: `duplicate category id "${id}"`,
      });
    catIds.add(id);
    if (typeof c.tint === 'string') tintOwners.set(c.tint, [...(tintOwners.get(c.tint) ?? []), { id, i }]);
    if (typeof c.icon === 'string' && !existsSync(join(contentDir, 'assets', c.icon.replace(/^\//, ''))))
      errors.push({
        file: catFile.file,
        line: catFile.lineOf([i, 'icon']),
        entryId: id,
        rule: 'ASSET',
        message: `icon "${c.icon}" not found in content/assets/`,
      });
  });
  for (const [tint, owners] of tintOwners) {
    if (owners.length < 2) continue;
    const names = owners.map((o) => `"${o.id}"`).join(' and ');
    for (const o of owners)
      errors.push({
        file: catFile.file,
        line: catFile.lineOf([o.i, 'tint']),
        entryId: o.id,
        rule: 'RULE-14',
        message: `tint "${tint}" is shared by categories ${names}`,
      });
  }

  for (const l of toolFiles) {
    if (!isObj(l.data)) continue;
    const d = l.data;
    // INV-07 / F-001.R5: the tool's category exists (F-001.AC7).
    if (typeof d.category === 'string' && catFile.data !== undefined && !catIds.has(d.category))
      errors.push({
        file: l.file,
        line: l.lineOf(['category']),
        entryId: idOf(d),
        rule: 'INV-07',
        message: `category "${d.category}" does not exist in content/categories.yaml`,
      });
    // INV-03: an embedded tool is never served from the portal's own origin (ADR-0009 build guard).
    const mode = d.openMode ?? (d.origin === 'own' ? 'embedded' : 'linked');
    if (
      mode === 'embedded' &&
      typeof d.url === 'string' &&
      URL.canParse(d.url) &&
      new URL(d.url).origin === portalOrigin
    )
      errors.push({
        file: l.file,
        line: l.lineOf(['url']),
        entryId: idOf(d),
        rule: 'INV-03',
        message: `an embedded tool must not be served from the portal origin ${portalOrigin}`,
      });
  }

  if (errors.length) throw new ContentErrors(errors);

  // 3. Normalize: RULE-07 open-mode defaults, INV-03 permission and offline defaults.
  const allTools: RegTool[] = toolFiles.map((l) => {
    const d = l.data as RawTool;
    return {
      ...d,
      openMode: d.origin === 'external' ? 'linked' : (d.openMode ?? 'embedded'),
      permissions: d.permissions ?? [],
      offline: d.offline ?? false,
      hidden: d.hidden ?? false,
      tags: d.tags ?? [],
      file: l.file,
    };
  });
  const allProjects: RegProject[] = projectFiles.map((l) => {
    const d = l.data as RawProject;
    return { ...d, hidden: d.hidden ?? false, tags: d.tags ?? [], file: l.file };
  });

  // 4. Derive build-time views; hidden entries never reach them (RULE-06, F-001.R4).
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const visibleTools = allTools.filter((t) => !t.hidden).sort(byName);
  const projects = allProjects.filter((p) => !p.hidden).sort((a, b) => b.year - a.year || byName(a, b));
  const categories = (catList as Category[])
    .map((c) => ({ ...c, tools: visibleTools.filter((t) => t.category === c.id) }))
    .filter((c) => c.tools.length > 0)
    .sort((a, b) => a.order - b.order);
  const changelogEvents: ChangelogEvent[] = [];
  for (const e of [...visibleTools, ...projects]) {
    changelogEvents.push({ date: e.added, type: 'added', kind: e.kind, id: e.id, name: e.name });
    if (e.updated) changelogEvents.push({ date: e.updated, type: 'updated', kind: e.kind, id: e.id, name: e.name });
  }
  changelogEvents.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const embeddedOrigins = [
    ...new Set(visibleTools.filter((t) => t.openMode === 'embedded').map((t) => new URL(t.url).origin)),
  ].sort();
  const toolMap = new Map(visibleTools.map((t) => [t.id, t]));

  return {
    allTools,
    visibleTools,
    toolById: (id) => toolMap.get(id),
    categories,
    projects,
    profile: profileFile.data as Profile,
    now: nowFile.data as NowNote,
    changelogEvents,
    embeddedOrigins,
    portalOrigin,
  };
}

let cached: Registry | undefined;
/** One load per process: the Astro config and every page share it. */
export const getRegistry = (): Registry => (cached ??= loadRegistry());
