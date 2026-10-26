// dist/ font-subset check (ADR-0003 amendment from SP-6): only the build-time subsets may ship.
// Fails on any other font file (a Fontsource face, a latin-ext/cyrillic/greek subset) and on fonts over budget.
// Language coverage (F-019, ADR-0012): every page holds both languages, so every character of text set in the display
// face (Unbounded) must be in its subsets, and every character set in the mono face (JetBrains Mono, ASCII only) must be
// in its subset; mono word lines marked `tk-mono-words` use the body face while Vietnamese shows, so their vi-VN text
// is exempt. Which face an element uses is read from the built CSS (rules naming --tk-font-family-*), the closest
// element with a face wins, and a class beats a tag.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, process.argv[2] ?? 'dist');
const ALLOWED = [
  'manrope-latin',
  'manrope-vietnamese',
  'unbounded-600-latin',
  'unbounded-600-vietnamese',
  'jbmono-ascii',
];
const FONT_EXT = /\.(woff2?|ttf|otf|eot)$/i;
const BUDGET_BYTES = 80 * 1024; // architecture.md: fonts ≤ 80 KB

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const problems: string[] = [];
let total = 0;
for (const file of walk(dist)) {
  if (!FONT_EXT.test(file)) continue;
  const rel = relative(dist, file);
  total += statSync(file).size;
  // Astro names assets <name>.<hash>.<ext>.
  const base = file
    .split('/')
    .pop()!
    .replace(FONT_EXT, '')
    .replace(/\.[A-Za-z0-9_-]{6,}$/, '');
  if (!file.endsWith('.woff2')) problems.push(`${rel}: only WOFF2 ships`);
  else if (!ALLOWED.includes(base)) problems.push(`${rel}: not one of the build-time subsets (${ALLOWED.join(', ')})`);
}
// ---- language coverage ----
type Face = 'display' | 'mono' | 'body';
const cssText = [...walk(dist)]
  .filter((f) => f.endsWith('.css'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const ranges: Record<'display' | 'mono', [number, number][]> = { display: [], mono: [] };
for (const m of cssText.matchAll(/@font-face\{([^}]*)\}/g)) {
  const family = /font-family:([^;]+)/.exec(m[1]!)?.[1] ?? '';
  const face = /Unbounded/.test(family) ? 'display' : /JetBrains/.test(family) ? 'mono' : undefined;
  const range = /unicode-range:([^;}]+)/.exec(m[1]!)?.[1];
  if (!face || !range) continue;
  for (const part of range.split(',')) {
    const [a, b] = part.trim().replace(/^U\+/i, '').split('-');
    ranges[face].push([parseInt(a!, 16), parseInt(b ?? a!, 16)]);
  }
}
const classFace = new Map<string, Face>();
const tagFace = new Map<string, Face>();
for (const m of cssText.matchAll(
  /([^{}@]+)\{([^{}]*font-family:var\(--tk-font-family-(display|mono|body)\)[^{}]*)\}/g,
)) {
  const face = m[3] as Face;
  for (const selector of m[1]!.split(',')) {
    if (selector.includes(':root[data-lang')) continue; // the tk-mono-words switch, handled below
    const last = selector.trim().split(/\s+|>/).pop() ?? '';
    const classes = [...last.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((c) => c[1]!);
    if (classes.length) for (const c of classes) classFace.set(c, face);
    else {
      const tag = /^[a-z][a-z0-9]*/.exec(last)?.[0];
      if (tag) tagFace.set(tag, face);
    }
  }
}
for (const tag of ['h1', 'h2', 'h3']) if (!tagFace.has(tag)) tagFace.set(tag, 'display');
tagFace.set('kbd', tagFace.get('kbd') ?? 'mono');

const covered = (face: 'display' | 'mono', cp: number) => ranges[face].some(([a, b]) => cp >= a && cp <= b);
const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
const decode = (t: string) =>
  t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
interface Frame {
  tag: string;
  face?: Face;
  lang?: string;
  monoWords: boolean;
}
const misses = new Map<string, Set<string>>();
for (const file of walk(dist)) {
  if (!file.endsWith('.html')) continue;
  const html = readFileSync(file, 'utf8')
    .replace(/<html[^>]*>/, '<html>')
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const stack: Frame[] = [{ tag: '#root', monoWords: false }];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) {
      const text = decode(m[4]).replace(/\s+/g, '');
      if (!text) continue;
      let face: Face = 'body';
      let lang: string | undefined;
      let monoWords = false;
      let faceFound = false;
      for (let i = stack.length - 1; i >= 0; i--) {
        const f = stack[i]!;
        if (!faceFound && f.face) [face, faceFound] = [f.face, true];
        if (f.monoWords) monoWords = true;
        lang ??= f.lang;
      }
      lang ??= 'en-US';
      if (face === 'body' || (face === 'mono' && monoWords && lang === 'vi-VN')) continue;
      for (const ch of text) {
        if (covered(face, ch.codePointAt(0)!)) continue;
        const key = `${relative(dist, file)} (${face}, ${lang})`;
        if (!misses.has(key)) misses.set(key, new Set());
        misses.get(key)!.add(ch);
      }
      continue;
    }
    const tag = m[2]!.toLowerCase();
    if (m[1]) {
      const at = stack.map((f) => f.tag).lastIndexOf(tag);
      if (at > 0) stack.length = at;
      continue;
    }
    if (VOID.has(tag) || m[3]!.endsWith('/')) continue;
    const attrs = m[3]!;
    const classes = /\sclass="([^"]*)"/.exec(attrs)?.[1]?.split(/\s+/) ?? [];
    const classHit = classes.map((c) => classFace.get(c)).find(Boolean);
    stack.push({
      tag,
      face: classHit ?? tagFace.get(tag),
      lang: /\slang="([^"]*)"/.exec(attrs)?.[1],
      monoWords: classes.includes('tk-mono-words'),
    });
  }
}
for (const [where, chars] of misses)
  problems.push(`${where}: no glyph for ${[...chars].map((c) => `"${c}"`).join(' ')}`);

if (total > BUDGET_BYTES) problems.push(`fonts total ${(total / 1024).toFixed(1)} KB, over the 80 KB budget`);

if (problems.length) {
  console.error(`fonts: ${problems.length} problem(s) in dist/:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `fonts: ok — ${(total / 1024).toFixed(1)} KB of build-time subsets in dist/, every display and mono text covered in both languages`,
);
