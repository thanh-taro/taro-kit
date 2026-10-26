// MOD-Copy codegen: specs/30-experience/copy.md -> a typed message catalog (COPY ID -> { en-US, vi-VN }).
// Placeholders are `{name}` (copy.md preamble); each id's placeholder names become a typed params object.
// F-019 (ADR-0012): every row has an en-US and a vi-VN column; a missing version, or versions with different
// placeholders, fails generation.

export const BANNER = 'Generated from specs/30-experience/copy.md by scripts/gen.ts. Do not edit.';

const LANGS = ['en-US', 'vi-VN'] as const;

export interface CopyEntry {
  id: string;
  text: { 'en-US': string; 'vi-VN': string };
  params: string[];
}

const ROW = /^\|\s*\*\*(COPY-[A-Za-z0-9_.-]+)\*\*\s*\|(.*)\|\s*$/;

/** Split a Markdown table row body on unescaped pipes. */
function cells(body: string): string[] {
  return body.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
}

const placeholders = (text: string) => [
  ...new Set([...text.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map((p) => p[1]!)),
];

export function parseCopy(markdown: string): CopyEntry[] {
  const out: CopyEntry[] = [];
  const seen = new Set<string>();
  for (const line of markdown.split('\n')) {
    const m = ROW.exec(line.trim());
    if (!m) continue;
    const [id, rest] = [m[1]!, m[2]!];
    const [en = '', vi = ''] = cells(rest);
    const text = { 'en-US': en, 'vi-VN': vi };
    for (const lang of LANGS) if (!text[lang]) throw new Error(`copy.md: ${id} has no ${lang} text`);
    if (seen.has(id)) throw new Error(`copy.md: ${id} is defined twice`);
    seen.add(id);
    const params = placeholders(en);
    const viParams = placeholders(vi);
    const missing = [...params.filter((p) => !viParams.includes(p)), ...viParams.filter((p) => !params.includes(p))];
    if (missing.length)
      throw new Error(`copy.md: ${id} has different placeholders in en-US and vi-VN: {${missing.join('}, {')}}`);
    out.push({ id, text, params });
  }
  if (!out.length) throw new Error('copy.md: no COPY rows found');
  return out;
}

export function renderCopyModule(entries: CopyEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const catalog = sorted
    .map(
      (e) =>
        `  ${JSON.stringify(e.id)}: { "en-US": ${JSON.stringify(e.text['en-US'])}, "vi-VN": ${JSON.stringify(e.text['vi-VN'])} },`,
    )
    .join('\n');
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
