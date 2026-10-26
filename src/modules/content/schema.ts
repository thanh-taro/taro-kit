// MOD-Content: the canonical domain schema, compiled in place by Ajv 2020 (ADR-0005).
// Ajv never ships to the browser: this file is imported only by build code.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';

// ajv-formats is CommonJS; its default export arrives wrapped under Node's ESM loader.
const addFormats = ((addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ??
  addFormatsModule) as unknown as (ajv: Ajv2020) => void;

export const SCHEMA_ID = 'tarokit.schema.json';
export type Def = 'tool' | 'category' | 'profile' | 'nowNote' | 'resume' | 'policy';

const cache = new Map<string, Ajv2020>();

function ajvFor(schemaPath: string): Ajv2020 {
  let ajv = cache.get(schemaPath);
  if (!ajv) {
    ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    ajv.addSchema(JSON.parse(readFileSync(schemaPath, 'utf8')));
    cache.set(schemaPath, ajv);
  }
  return ajv;
}

export const defaultSchemaPath = (root: string) => join(root, 'specs/10-domain/project.schema.json');

export function validatorFor(schemaPath: string, def: Def): ValidateFunction {
  const v = ajvFor(schemaPath).getSchema(`${SCHEMA_ID}#/$defs/${def}`);
  if (!v) throw new Error(`schema ${schemaPath} has no $defs/${def}`);
  return v;
}

export interface MappedError {
  rule: string;
  message: string;
  path: (string | number)[];
}

// ---------- rule tags (ADR-0005, SP-5 amendment) ----------
// Rule-bearing subschemas carry `"$comment": "<RULE-ID>: …"`. Errors are mapped to a rule by that tag,
// never by the subschema's position, so reordering or extending the schema keeps the error contract.
// Implements: F-001.R2 (name the broken rule).

type Node = Record<string, unknown>;
const isNode = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);
const RULE_TAG = /^((?:INV|RULE)-\d+)\b/;
const tagOf = (n: unknown): string | undefined =>
  isNode(n) && typeof n.$comment === 'string' ? RULE_TAG.exec(n.$comment)?.[1] : undefined;

const docs = new Map<string, Node>();
function schemaDoc(schemaPath: string): Node {
  let doc = docs.get(schemaPath);
  if (!doc) {
    doc = JSON.parse(readFileSync(schemaPath, 'utf8')) as Node;
    docs.set(schemaPath, doc);
  }
  return doc;
}

const unescape = (s: string) => decodeURIComponent(s).replace(/~1/g, '/').replace(/~0/g, '~');
const pointer = (s: string) => s.replace(/^#\/?/, '').split('/').filter(Boolean).map(unescape);
/** One JSON-pointer step; arrays (allOf, items) are indexed by their numeric segment. */
const step = (n: unknown, k: string): unknown =>
  typeof n === 'object' && n !== null ? (n as Record<string, unknown>)[k] : undefined;
const walk = (from: unknown, segs: string[]): unknown => segs.reduce<unknown>(step, from);

/** The innermost tag on the subschemas that hold the failing keyword (Ajv's error schemaPath). */
function tagOnSchemaPath(doc: Node, def: Def, schemaPath: string): string | undefined {
  // Ajv restarts the path at a $ref target: "#/$defs/…" is document-relative; anything else is relative to the def.
  const segs = pointer(schemaPath);
  let node: unknown = segs[0] === '$defs' ? doc : walk(doc, ['$defs', def]);
  let tag: string | undefined;
  for (const seg of segs) {
    tag = tagOf(node) ?? tag;
    node = step(node, seg);
  }
  return tag;
}

/** A schema together with the subschemas it inherits through $ref and allOf. */
function expand(doc: Node, n: Node, depth = 0): Node[] {
  const out = [n];
  if (depth > 8) return out;
  if (typeof n.$ref === 'string' && n.$ref.startsWith('#/')) {
    const target = walk(doc, pointer(n.$ref));
    if (isNode(target)) out.push(...expand(doc, target, depth + 1));
  }
  if (Array.isArray(n.allOf)) for (const m of n.allOf) if (isNode(m)) out.push(...expand(doc, m, depth + 1));
  return out;
}

/**
 * The tag on the property schema at the error's instance path. A shared definition such as `slug` is
 * reached through $ref, which hides the referring property from schemaPath; the referring property
 * carries the rule (an entry id is INV-01, a category id or a tool's category is INV-07).
 */
function tagOnInstancePath(doc: Node, def: Def, path: (string | number)[]): string | undefined {
  const start = walk(doc, ['$defs', def]);
  let nodes: Node[] = isNode(start) ? [start] : [];
  for (const key of path)
    nodes = nodes
      .flatMap((n) => expand(doc, n))
      .map((s) => (typeof key === 'number' ? s.items : isNode(s.properties) ? s.properties[key] : undefined))
      .filter(isNode);
  return nodes.map(tagOf).find(Boolean);
}

// ---------- INV-09: localized text (F-019, ADR-0005 note) ----------
// A localized field's schema is an object requiring both language keys; a name field is a oneOf of a string and such
// an object. Errors inside either are reported as INV-09 naming the field, never as raw schema noise.
const LANG_KEYS = ['en-US', 'vi-VN'];
const isLocalizedSchema = (n: Node): boolean =>
  Array.isArray(n.required) && LANG_KEYS.every((k) => (n.required as unknown[]).includes(k));

/** The schemas at an instance path, through $ref, allOf and oneOf branches. */
function schemasAt(doc: Node, def: Def, path: (string | number)[]): Node[] {
  const start = walk(doc, ['$defs', def]);
  const open = (n: Node): Node[] =>
    expand(doc, n).flatMap((s) => [s, ...(Array.isArray(s.oneOf) ? s.oneOf.filter(isNode).flatMap(open) : [])]);
  let nodes: Node[] = isNode(start) ? open(start) : [];
  for (const key of path)
    nodes = nodes
      .map((s) => (typeof key === 'number' ? s.items : isNode(s.properties) ? s.properties[key] : undefined))
      .filter(isNode)
      .flatMap(open);
  return nodes;
}

const isLangKey = (k: string | number | undefined): k is string => typeof k === 'string' && LANG_KEYS.includes(k);

/**
 * Drops the noise Ajv reports for a name field (a oneOf of a string and a localized object): the branch that does not
 * fit the value's type, and the oneOf summary when a branch error explains it. Implements: INV-09 (one error per
 * mistake, F-001.R2).
 */
export function relevantErrors(errors: readonly ErrorObject[], data: unknown): ErrorObject[] {
  const pathOf = (e: ErrorObject) => e.instancePath.split('/').slice(1);
  return errors.filter((e) => {
    const branch = /\/oneOf\/(\d+)\//.exec(e.schemaPath);
    if (e.keyword === 'oneOf')
      return !errors.some((o) => o !== e && o.schemaPath.startsWith(e.schemaPath + '/') && keepBranch(o));
    return !branch || keepBranch(e);
  });
  function keepBranch(e: ErrorObject): boolean {
    const m = /\/oneOf\/(\d+)\//.exec(e.schemaPath);
    if (!m) return true;
    const segs = pathOf(e);
    const field = isLangKey(segs.at(-1)) ? segs.slice(0, -1) : segs;
    const value = field.reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], data);
    // Branch 0 is the plain string, the other the localized object (project.schema.json name fields).
    return (typeof value === 'string') === (m[1] === '0');
  }
}

/** The INV-09 reading of an error, if it is about localized text. */
function localizedError(
  err: ErrorObject,
  data: unknown,
  doc: Node,
  def: Def,
  path: (string | number)[],
): MappedError | null {
  const last = path.at(-1);
  const fieldPath = isLangKey(last) ? path.slice(0, -1) : path;
  const field = fieldPath.join('.') || '(root)';
  const schemas = schemasAt(doc, def, fieldPath);
  const localized = schemas.some(isLocalizedSchema);
  const value = at(data, fieldPath);
  if (localized && err.keyword === 'required' && isLangKey(String(err.params.missingProperty)))
    return {
      rule: 'INV-09',
      message: `${field} has no ${String(err.params.missingProperty)} version`,
      path: fieldPath,
    };
  if (localized && isLangKey(last) && err.keyword === 'minLength' && at(data, path) === '')
    return { rule: 'INV-09', message: `${field} has an empty ${last} version`, path };
  if (localized && !isLangKey(last) && err.keyword === 'type' && typeof value === 'string')
    return { rule: 'INV-09', message: `${field} must have an en-US and a vi-VN version`, path: fieldPath };
  // A field that is one text for both languages (a tool's name, the profile name, the nickname) written per language.
  if (
    !localized &&
    err.keyword === 'type' &&
    err.params.type === 'string' &&
    isNode(value) &&
    Object.keys(value).some(isLangKey)
  )
    return { rule: 'INV-09', message: `${field} must be one text for both languages`, path: fieldPath };
  return null;
}

const at = (data: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], data);

/** Map one Ajv error on `$defs/<def>` to a domain rule (by its `$comment` tag) and a readable message. */
export function mapAjvError(
  err: ErrorObject,
  data: Record<string, unknown> | undefined,
  schemaPath: string,
  def: Def,
): MappedError | null {
  if (err.keyword === 'if') return null; // the `then` error carries the detail
  const path = err.instancePath
    .split('/')
    .slice(1)
    .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const field = path.join('.') || '(root)';
  const value = `"${String(at(data, path))}"`;
  const doc = schemaDoc(schemaPath);
  const localized = localizedError(err, data, doc, def, path);
  if (localized) return localized;
  const rule = tagOnSchemaPath(doc, def, err.schemaPath) ?? tagOnInstancePath(doc, def, path);

  if (rule === 'RULE-07')
    return {
      rule,
      message: `an ${String(data?.origin ?? '?')} tool cannot have openMode "${String(data?.openMode ?? '?')}" (external tools are always linked; embedded tools must be own)`,
      path: ['openMode'],
    };
  if (rule === 'INV-02' && (err.keyword === 'pattern' || err.keyword === 'format'))
    return { rule, message: `${field} ${value} is not a secure https address`, path };
  if ((rule === 'INV-01' || rule === 'INV-07') && err.keyword === 'pattern')
    return { rule, message: `${field} ${value} is not a lowercase slug`, path };
  if (rule === 'RULE-14' && err.keyword === 'enum') {
    const allowed = (err.params.allowedValues as unknown[]).join(', ');
    return { rule, message: `${field} ${value} is not one of ${allowed}`, path };
  }
  if (rule) return { rule, message: `${field} ${err.message ?? 'is invalid'}`, path };

  if (err.keyword === 'oneOf')
    return { rule: 'SCHEMA', message: `${field} must be a text or a text per language`, path };
  if (err.keyword === 'format')
    return { rule: 'SCHEMA', message: `${field} ${value} is not a valid ${String(err.params.format)}`, path };
  if (err.keyword === 'required')
    return { rule: 'SCHEMA', message: `missing required field "${String(err.params.missingProperty)}"`, path };
  if (err.keyword === 'additionalProperties' || err.keyword === 'unevaluatedProperties') {
    const name = err.params.additionalProperty ?? err.params.unevaluatedProperty;
    return { rule: 'SCHEMA', message: `${field}: unknown field "${String(name)}"`, path: [...path, String(name)] };
  }
  return { rule: 'SCHEMA', message: `${field} ${err.message ?? 'is invalid'}`, path };
}
