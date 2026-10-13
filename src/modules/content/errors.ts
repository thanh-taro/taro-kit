// MOD-Content error contract (ADR-0005 amendment from SP-5):
//   file:line › entry › rule: message      one line per error, every error reported at once.
// Implements: F-001.R2 (name the file, the entry and the broken rule).

export interface ContentError {
  /** Path relative to the content folder's parent, e.g. content/tools/json.yaml */
  file: string;
  line?: number;
  /** Entry or category id, or "-" when the file has none. */
  entryId: string;
  /** Domain rule id (INV-01, INV-02, INV-03, INV-06, INV-07, RULE-07, RULE-14), or SCHEMA, YAML, ASSET. */
  rule: string;
  message: string;
}

export const formatError = (e: ContentError): string =>
  `${e.file}${e.line ? `:${e.line}` : ''} › ${e.entryId} › ${e.rule}: ${e.message}`;

export class ContentErrors extends Error {
  readonly errors: ContentError[];

  constructor(errors: ContentError[]) {
    super(
      `Content validation failed with ${errors.length} error(s):\n` +
        errors.map((e) => `  ${formatError(e)}`).join('\n'),
    );
    this.name = 'ContentErrors';
    this.errors = errors;
  }
}
