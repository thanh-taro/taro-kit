// MOD-Content: load -> validate (schema + invariants) -> normalize -> derive (ADR-0005).
// Runs in Node at build (Astro config, pages, scripts). Never runs in the browser.
// Implements: F-001.R1, F-001.R2, F-001.R3, F-001.R4, F-001.R5, F-017.R4 (optional résumé), F-017.R5,
// F-018.R5 (the two required policies).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { isScalar, LineCounter, parseDocument } from 'yaml';
import type {
  Category,
  EntryBase,
  NowNote,
  Policy as RawPolicy,
  Profile,
  Resume,
  Tool,
} from '../../generated/domain.ts';
import { hasResumeEntries, resumeEntryName, resumePeriodErrors } from './resume.ts';
import { parsePolicy, type Policy, policyLinkErrors, policyMixedLists, policySectionName } from './policy.ts';
import {
  changelogItems,
  type DatedItem,
  toolsByCategory,
  visibleTools as deriveVisibleTools,
  visibleCategories,
} from './derive.ts';
import { AVATAR_TYPES, resolveAsset } from './assets.ts';
import { type ContentError, ContentErrors } from './errors.ts';
import { LANGUAGES, type Lang } from '../language/languages.ts';
import { type Def, defaultSchemaPath, mapAjvError, relevantErrors, validatorFor } from './schema.ts';

/** The portal's own origin (ADR-0001, D-025). */
export const PORTAL_ORIGIN = 'https://tarokit.app';

/** The origin this build serves from: $TAROKIT_PORTAL_ORIGIN when set and not empty, else the production origin. */
export const portalOriginFor = (override?: string): string =>
  override ?? (process.env.TAROKIT_PORTAL_ORIGIN || PORTAL_ORIGIN);

// ---------- normalized registry types (strict, unlike the generated ones; ADR-0005) ----------
type Permission = NonNullable<Tool['permissions']>[number];
/** json-schema-to-typescript drops `allOf` beside sibling keywords, so the entry base is composed here. */
export type RawTool = EntryBase & Tool;

export interface RegTool extends Omit<RawTool, 'openMode' | 'permissions' | 'offline' | 'hidden' | 'tags'> {
  openMode: 'embedded' | 'linked';
  permissions: Permission[];
  offline: boolean;
  hidden: boolean;
  tags: string[];
  file: string;
}
export interface RegCategory extends Category {
  /** Visible tools in this category, sorted by name. */
  tools: RegTool[];
}
/** A dated changelog item of a visible tool (RULE-04: the changelog lists tools only). */
export type ChangelogEvent = DatedItem;
export interface Registry {
  /** Every tool, hidden ones included. For checks only (RULE-06). */
  allTools: RegTool[];
  visibleTools: RegTool[];
  toolById(id: string): RegTool | undefined;
  /** Categories with at least one visible tool, in display order (RULE-06). */
  categories: RegCategory[];
  profile: Profile;
  /** The profile avatar's validated absolute file (inside content/assets/, a raster image), if it has one. */
  avatarFile?: string;
  /** The Now note, or undefined when content has no now.yaml (F-010.R4). */
  now?: NowNote;
  /**
   * The résumé, or undefined when content has no resume.yaml or it has no entries in any section (ENT-Resume,
   * F-017.R4): then there is no Résumé page and nothing links to it.
   */
  resume?: Resume;
  /** The privacy policy (ENT-Policy, F-018.R1), required, with each section's body parsed into blocks. */
  privacy: Policy;
  /** The terms of use (ENT-Policy, F-018.R2), required, with each section's body parsed into blocks. */
  terms: Policy;
  /** Changelog items of visible tools, newest first (RULE-04); `changelog()` groups them by month. */
  changelogEvents: ChangelogEvent[];
  embeddedOrigins: string[];
  portalOrigin: string;
}

export interface LoadOptions {
  /** Repo root: holds specs/ (default: process.cwd()). */
  root?: string;
  /** Content folder (default: <root>/content, or $TAROKIT_CONTENT_DIR when set and not empty). */
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
  /** The YAML scalar style at a path (`BLOCK_LITERAL`, `BLOCK_FOLDED`, `PLAIN`, …), if a scalar is there. */
  scalarType: (path: (string | number)[]) => string | undefined;
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
/** Every string in loaded content in Unicode NFC, so lengths count letters, not code points (ADR-0005 note, F-019). */
function nfc(v: unknown): unknown {
  if (typeof v === 'string') return v.normalize('NFC');
  if (Array.isArray(v)) return v.map(nfc);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nfc(x)]));
  return v;
}
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
  const scalarType = (path: (string | number)[]) => {
    const node = doc.getIn(path, true);
    return isScalar(node) ? node.type : undefined;
  };
  return { file, data: nfc(doc.toJS()), lineOf, scalarType };
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
  const contentDir = opts.contentDir ?? (process.env.TAROKIT_CONTENT_DIR || join(root, 'content'));
  const schemaPath = opts.schemaPath ?? defaultSchemaPath(root);
  // An empty TAROKIT_PORTAL_ORIGIN (as `pnpm build` sets it) means the production origin.
  const portalOrigin = portalOriginFor(opts.portalOrigin);
  const relRoot = join(contentDir, '..'); // errors read "content/tools/x.yaml" wherever the folder lives
  const errors: ContentError[] = [];
  const load = (abs: string) => loadYaml(relRoot, abs, errors);
  const required = (name: string): Loaded => {
    const abs = join(contentDir, name);
    if (existsSync(abs)) return load(abs);
    errors.push({ file: relative(relRoot, abs), entryId: '-', rule: 'SCHEMA', message: 'file is missing' });
    return { file: relative(relRoot, abs), data: undefined, lineOf: () => undefined, scalarType: () => undefined };
  };

  const toolFiles = listYaml(join(contentDir, 'tools')).map(load);
  const catFile = required('categories.yaml');
  const profileFile = required('profile.yaml');
  // The Now note is optional: without now.yaml, SCR-Now shows only the changelog (F-010.R4).
  const nowPath = join(contentDir, 'now.yaml');
  const nowFile = existsSync(nowPath) ? load(nowPath) : undefined;
  // The résumé is optional too: without resume.yaml there is no Résumé page (F-017.R4). An empty file is a résumé
  // with no entries, which also counts as none (ENT-Resume).
  const resumePath = join(contentDir, 'resume.yaml');
  const resumeFile = existsSync(resumePath) ? load(resumePath) : undefined;
  if (resumeFile && resumeFile.data === null) resumeFile.data = {};
  // Both policies are required (ENT-Policy, F-018.R5): a missing one is "file is missing" (ADR-0005 note from F-018).
  const policyFiles = [required('privacy.yaml'), required('terms.yaml')] as const;

  // 1. Schema (F-001.R2). Each file is checked against its $defs entry of the domain schema.
  // Fields that already failed the schema; the invariant checks skip them, so one mistake gives one error.
  const schemaFailed = new Set<string>();
  const fieldKey = (file: string, path: (string | number)[]) => `${file}#${path.join('/')}`;
  /** How an error names its entry: the file's id by default; résumé entries by section and position (F-017.R5). */
  type EntryNaming = (
    target: unknown,
    path: (string | number)[],
    message: string,
  ) => { entryId: string; message: string };
  const namedById: EntryNaming = (target, _path, message) => ({ entryId: idOf(target), message });
  const schemaCheck = (l: Loaded, def: Def, prefix: (string | number)[] = [], naming: EntryNaming = namedById) => {
    if (l.data === undefined) return;
    const target = prefix.reduce<unknown>((o, k) => (o as Obj | undefined)?.[k as string], l.data);
    const validate = validatorFor(schemaPath, def);
    if (validate(target)) return;
    const seen = new Set<string>();
    for (const err of relevantErrors(validate.errors ?? [], target)) {
      const m = mapAjvError(err, isObj(target) ? target : undefined, schemaPath, def);
      if (!m) continue;
      schemaFailed.add(fieldKey(l.file, [...prefix, ...m.path]));
      const named = naming(target, m.path, m.message);
      const key = `${m.rule}|${named.entryId}|${named.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      errors.push({
        file: l.file,
        line: l.lineOf([...prefix, ...m.path]),
        entryId: named.entryId,
        rule: m.rule,
        message: named.message,
      });
    }
  };
  // F-017.R5: a résumé entry is "<section> <n>", counting from 1, and the message names the field inside it.
  const resumeNaming: EntryNaming = (_target, path, message) => {
    const [section, index] = path;
    if (typeof section !== 'string' || typeof index !== 'number') return { entryId: '-', message };
    const inEntry = `${section}.${index}`;
    const rest = message.startsWith(inEntry) ? message.slice(inEntry.length).replace(/^[.:]\s?/, '') : message;
    return { entryId: resumeEntryName(section, index), message: rest };
  };
  // F-018.R5: a policy section is "section <n>", counting from 1, and the message names the field inside it.
  const policyNaming: EntryNaming = (_target, path, message) => {
    const [key, index] = path;
    if (key !== 'sections' || typeof index !== 'number') return { entryId: '-', message };
    const inSection = `sections.${index}`;
    const rest = message.startsWith(inSection) ? message.slice(inSection.length).replace(/^[.:]\s?/, '') : message;
    return { entryId: policySectionName(index), message: rest };
  };
  toolFiles.forEach((l) => schemaCheck(l, 'tool'));
  const catList: unknown[] = Array.isArray(catFile.data) ? catFile.data : [];
  if (catFile.data !== undefined && !Array.isArray(catFile.data))
    errors.push({ file: catFile.file, entryId: '-', rule: 'SCHEMA', message: 'must be a list of categories' });
  catList.forEach((_, i) => schemaCheck(catFile, 'category', [i]));
  schemaCheck(profileFile, 'profile');
  if (nowFile) schemaCheck(nowFile, 'nowNote');
  if (resumeFile) schemaCheck(resumeFile, 'resume', [], resumeNaming);
  policyFiles.forEach((l) => schemaCheck(l, 'policy', [], policyNaming));

  // 2. Invariants the schema cannot express (ADR-0005).
  const entries = toolFiles.filter((l) => idOf(l.data) !== '-');

  // INV-01: tool ids are unique. Both entries are named (F-001.AC2).
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
    // Bundled assets exist, inside content/assets/ (ADR-0005).
    const icon = d.icon;
    if (typeof icon === 'string' && !schemaFailed.has(fieldKey(l.file, ['icon']))) {
      const site = { contentDir, file: l.file, entryId: idOf(d), field: 'icon', line: l.lineOf(['icon']) };
      resolveAsset(icon, site, errors);
    }
  }

  // The profile avatar is a bundled raster image (ADR-0005, F-008.R1). Its one validated file is what the
  // avatar module imports (MOD-Content `avatarFile`), so nothing downstream recomputes the path.
  const avatar = isObj(profileFile.data) ? profileFile.data.avatar : undefined;
  const avatarFile =
    typeof avatar === 'string' && !schemaFailed.has(fieldKey(profileFile.file, ['avatar']))
      ? resolveAsset(
          avatar,
          {
            contentDir,
            file: profileFile.file,
            entryId: '-',
            field: 'avatar',
            line: profileFile.lineOf(['avatar']),
            kinds: AVATAR_TYPES,
          },
          errors,
        )
      : undefined;

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
    if (typeof c.icon === 'string' && !schemaFailed.has(fieldKey(catFile.file, [i, 'icon'])))
      resolveAsset(
        c.icon,
        { contentDir, file: catFile.file, entryId: id, field: 'icon', line: catFile.lineOf([i, 'icon']) },
        errors,
      );
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
    if (
      typeof d.category === 'string' &&
      !schemaFailed.has(fieldKey(l.file, ['category'])) &&
      catFile.data !== undefined &&
      !catIds.has(d.category)
    )
      errors.push({
        file: l.file,
        line: l.lineOf(['category']),
        entryId: idOf(d),
        rule: 'INV-07',
        message: `category "${d.category}" does not exist in content/categories.yaml`,
      });
    // INV-03: no tool is served from the portal's own origin: an embedded one could not be isolated (ADR-0009 build
    // guard), and a linked one would be a portal page under the portal's service worker (F-011). The production
    // origin is always refused too, whatever origin this build is configured with.
    const mode = d.openMode ?? (d.origin === 'own' ? 'embedded' : 'linked');
    const toolOrigin = typeof d.url === 'string' && URL.canParse(d.url) ? new URL(d.url).origin : undefined;
    if (toolOrigin && (toolOrigin === portalOrigin || toolOrigin === PORTAL_ORIGIN))
      errors.push({
        file: l.file,
        line: l.lineOf(['url']),
        entryId: idOf(d),
        rule: 'INV-03',
        message: `${mode === 'embedded' ? 'an embedded' : 'a linked'} tool must not be served from the portal origin ${toolOrigin}`,
      });
  }

  // INV-08: a résumé period's end month is on or after its start month (F-017.AC9). Months that failed the schema
  // already have their error.
  if (resumeFile)
    for (const p of resumePeriodErrors(resumeFile.data)) {
      const at = (field: string) => fieldKey(resumeFile.file, [p.section, p.index, field]);
      if (schemaFailed.has(at('start')) || schemaFailed.has(at('end'))) continue;
      errors.push({
        file: resumeFile.file,
        line: resumeFile.lineOf([p.section, p.index, 'end']),
        entryId: resumeEntryName(p.section, p.index),
        rule: 'INV-08',
        message: `end ${p.end} is before start ${p.start}`,
      });
    }

  // Policy bodies (ADR-0005 note from F-018): a literal block, so line breaks are kept; no paragraph that mixes list
  // lines with other lines; and INV-02 on every link. Each error names the section (F-018.R5).
  for (const l of policyFiles) {
    const sections = isObj(l.data) && Array.isArray(l.data.sections) ? (l.data.sections as unknown[]) : [];
    /** The file line of a body's line `i` (from 0): a literal block's text starts on the line after its `|`. */
    const bodyLine = (index: number, lang: Lang, i: number) => {
      const path = ['sections', index, 'body', lang];
      const at = l.lineOf(path);
      return at !== undefined && l.scalarType(path) === 'BLOCK_LITERAL' ? at + 1 + i : at;
    };
    // Each language's body is checked on its own (INV-09); the message names the language.
    const literal = new Set<string>();
    sections.forEach((section, index) => {
      const body = isObj(section) ? section.body : undefined;
      if (!isObj(body)) return;
      if (schemaFailed.has(fieldKey(l.file, ['sections', index, 'body']))) return;
      for (const lang of LANGUAGES) {
        if (typeof body[lang] !== 'string') continue;
        if (l.scalarType(['sections', index, 'body', lang]) === 'BLOCK_LITERAL') {
          literal.add(`${index}|${lang}`);
          continue;
        }
        errors.push({
          file: l.file,
          line: l.lineOf(['sections', index, 'body', lang]),
          entryId: policySectionName(index),
          rule: 'SCHEMA',
          message: `body must be a literal block (|), so its line breaks are kept (${lang})`,
        });
      }
    });
    for (const m of policyMixedLists(l.data).filter((m) => literal.has(`${m.index}|${m.lang}`)))
      errors.push({
        file: l.file,
        line: bodyLine(m.index, m.lang, m.line),
        entryId: policySectionName(m.index),
        rule: 'SCHEMA',
        message: `paragraph ${m.paragraph + 1} mixes list lines ("- ") with other lines; put a blank line before the list (${m.lang})`,
      });
    for (const e of policyLinkErrors(l.data))
      errors.push({
        file: l.file,
        line: bodyLine(e.index, e.lang, e.line),
        entryId: policySectionName(e.index),
        rule: 'INV-02',
        message:
          (e.kind === 'insecure'
            ? `link "${e.link}" is not https`
            : `link "${e.link}" must be [text](address) with an https or mailto address and no spaces; write ( and ) in an address as %28 and %29`) +
          ` (${e.lang})`,
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

  // 4. Derive build-time views; hidden entries never reach them (RULE-06, F-001.R4).
  const visibleTools = deriveVisibleTools(allTools);
  const categories = visibleCategories(catList as Category[], allTools).map((c) => ({
    ...c,
    tools: toolsByCategory(allTools, c.id),
  }));
  const changelogEvents = changelogItems(allTools);
  const embeddedOrigins = [
    ...new Set(visibleTools.filter((t) => t.openMode === 'embedded').map((t) => new URL(t.url).origin)),
  ].sort();
  const toolMap = new Map(visibleTools.map((t) => [t.id, t]));

  return {
    allTools,
    visibleTools,
    toolById: (id) => toolMap.get(id),
    categories,
    profile: profileFile.data as Profile,
    avatarFile,
    now: nowFile?.data as NowNote | undefined,
    resume: hasResumeEntries(resumeFile?.data as Resume | undefined) ? (resumeFile?.data as Resume) : undefined,
    privacy: parsePolicy(policyFiles[0].data as RawPolicy),
    terms: parsePolicy(policyFiles[1].data as RawPolicy),
    changelogEvents,
    embeddedOrigins,
    portalOrigin,
  };
}

let cached: Registry | undefined;
/** One load per process: the Astro config and every page share it. */
export const getRegistry = (): Registry => (cached ??= loadRegistry());
/** Forgets the cached registry, so the next `getRegistry()` reloads content (dev server, on content edits). */
export const resetRegistry = (): void => {
  cached = undefined;
};
/** The content folder `getRegistry()` reads: $TAROKIT_CONTENT_DIR, or <cwd>/content. */
export const contentDirectory = (): string =>
  resolve(process.env.TAROKIT_CONTENT_DIR || join(process.cwd(), 'content'));
