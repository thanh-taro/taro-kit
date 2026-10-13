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
export type Def = 'tool' | 'project' | 'category' | 'profile' | 'nowNote';

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

const at = (data: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], data);

/**
 * Map one Ajv error to a domain rule and a readable message.
 * The rule-bearing subschemas carry no `$comment` rule tags yet (see the SP-5 amendment of ADR-0005),
 * so RULE-07 is recognised by its position in $defs/tool (allOf/1 and allOf/2 hold the if/then pairs).
 */
export function mapAjvError(err: ErrorObject, data: Record<string, unknown> | undefined): MappedError | null {
  const path = err.instancePath
    .split('/')
    .slice(1)
    .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  const field = path.join('.') || '(root)';
  if (err.keyword === 'if') return null; // the `then` error carries the detail
  if (/\/allOf\/[12]\/then\//.test(err.schemaPath)) {
    return {
      rule: 'RULE-07',
      message: `an ${String(data?.origin ?? '?')} tool cannot have openMode "${String(data?.openMode ?? '?')}" (external tools are always linked; embedded tools must be own)`,
      path: ['openMode'],
    };
  }
  if (err.keyword === 'pattern' && /(^|\.)(url|sourceUrl)$/.test(field)) {
    return { rule: 'INV-02', message: `${field} "${String(at(data, path))}" is not a secure https address`, path };
  }
  if (field === 'id' && err.keyword === 'pattern') {
    return { rule: 'INV-01', message: `id "${String(data?.id)}" is not a lowercase slug`, path };
  }
  if (field === 'tint' && err.keyword === 'enum') {
    return { rule: 'RULE-14', message: `tint "${String(data?.tint)}" is not one of violet, mango, sky, mint`, path };
  }
  if (err.keyword === 'format') {
    return {
      rule: 'SCHEMA',
      message: `${field} "${String(at(data, path))}" is not a valid ${String(err.params.format)}`,
      path,
    };
  }
  if (err.keyword === 'required') {
    return { rule: 'SCHEMA', message: `missing required field "${String(err.params.missingProperty)}"`, path };
  }
  if (err.keyword === 'additionalProperties' || err.keyword === 'unevaluatedProperties') {
    const name = err.params.additionalProperty ?? err.params.unevaluatedProperty;
    return { rule: 'SCHEMA', message: `${field}: unknown field "${String(name)}"`, path: [...path, String(name)] };
  }
  return { rule: 'SCHEMA', message: `${field} ${err.message ?? 'is invalid'}`, path };
}
