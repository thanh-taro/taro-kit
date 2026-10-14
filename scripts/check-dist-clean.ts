// dist/ fixture check (adapters/tests.md): the production build never contains tests-only pages or test content.
// Fails on a `__fixtures__` route and on any text file that carries test-fixture markers.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, process.argv[2] ?? 'dist');
const TEXT = /\.(html|js|mjs|css|json|xml|txt|webmanifest)$/i;
/** Markers of tests-only pages and fixture content (tests/fixtures/pages, tests/fixtures/content). */
const MARKERS = ['__fixtures__', 'tests/fixtures', 'Fixture tool', 'fx-hidden'];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const problems: string[] = [];
for (const file of walk(dist)) {
  const rel = relative(dist, file);
  if (rel.includes('__fixtures__')) problems.push(`${rel}: tests-only page`);
  else if (TEXT.test(file)) {
    const text = readFileSync(file, 'utf8');
    for (const m of MARKERS) if (text.includes(m)) problems.push(`${rel}: contains "${m}"`);
  }
}

if (problems.length) {
  console.error(`dist-clean: ${problems.length} problem(s) in ${relative(root, dist)}/\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`dist-clean: ok — no fixture pages or content in ${relative(root, dist)}/`);
