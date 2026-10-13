// MOD-Copy codegen: specs/30-experience/copy.md -> a typed message catalog (COPY ID -> string).
// Placeholders are `{name}` (copy.md preamble); each id's placeholder names become a typed params object.

export const BANNER = 'Generated from specs/30-experience/copy.md by scripts/gen.ts. Do not edit.';

export interface CopyEntry {
  id: string;
  text: string;
  params: string[];
}

const ROW = /^\|\s*\*\*(COPY-[A-Za-z0-9_.-]+)\*\*\s*\|(.*)\|\s*$/;

/** Split a Markdown table row body on unescaped pipes. */
function cells(body: string): string[] {
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

export function parseCopy(markdown: string): CopyEntry[] {
  const out: CopyEntry[] = [];
  const seen = new Set<string>();
  for (const line of markdown.split('\n')) {
    const m = ROW.exec(line.trim());
    if (!m) continue;
    const [id, rest] = [m[1], m[2]];
    const [text = ''] = cells(rest);
    if (!text) throw new Error(`copy.md: ${id} has no text`);
    if (seen.has(id)) throw new Error(`copy.md: ${id} is defined twice`);
    seen.add(id);
    const params = [...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((p) => p[1]))];
    out.push({ id, text, params });
  }
  if (!out.length) throw new Error('copy.md: no COPY rows found');
  return out;
}

export function renderCopyModule(entries: CopyEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const catalog = sorted.map((e) => `  ${JSON.stringify(e.id)}: ${JSON.stringify(e.text)},`).join('\n');
  const params = sorted
    .filter((e) => e.params.length)
    .map((e) => `  ${JSON.stringify(e.id)}: { ${e.params.map((p) => `${p}: string | number`).join('; ')} };`)
    .join('\n');
  return `/* ${BANNER} */
export const COPY = {
${catalog}
} as const;

export type CopyId = keyof typeof COPY;

/** Placeholder values required by each COPY id that has \`{placeholders}\`. */
export interface CopyParams {
${params}
}
`;
}
