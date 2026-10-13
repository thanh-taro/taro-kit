// dist/ font-subset check (ADR-0003 amendment from SP-6): only the build-time subsets may ship.
// Fails on any other font file (a Fontsource face, a latin-ext/cyrillic/greek subset) and on fonts over budget.
import { readdirSync, statSync } from 'node:fs';
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
if (total > BUDGET_BYTES) problems.push(`fonts total ${(total / 1024).toFixed(1)} KB, over the 80 KB budget`);

if (problems.length) {
  console.error(`fonts: ${problems.length} problem(s) in dist/:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`fonts: ok — ${(total / 1024).toFixed(1)} KB of build-time subsets in dist/`);
