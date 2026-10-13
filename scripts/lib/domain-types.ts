// MOD-Content codegen (ADR-0005 + SP-5 amendment): domain JSON Schema -> src/generated/domain.ts.
import { compile } from 'json-schema-to-typescript';

export const BANNER = '/* Generated from specs/10-domain/project.schema.json by scripts/gen.ts. Do not edit. */';

export async function renderDomainTypes(schema: object, schemaDir: string): Promise<string> {
  return compile(schema as never, 'TaroKitDataModel', {
    bannerComment: BANNER,
    unreachableDefinitions: true,
    additionalProperties: false,
    // The default expands maxItems into huge tuple unions (PersonalData became ~900 lines).
    maxItems: -1,
    // $defs/date would become `type Date`, shadowing the built-in Date.
    customName: (_schema, key) => (key === 'date' ? 'IsoDate' : undefined),
    cwd: schemaDir,
    format: true,
  });
}
