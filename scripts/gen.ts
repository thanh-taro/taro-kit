// `pnpm gen`: every generated file, from the specs (MOD-Delivery "gen").
//   committed (CI fails if stale, ADR-0003 / ADR-0005 / MOD-Copy):
//     src/generated/tokens.css, src/generated/tokens.ts, src/generated/domain.ts, src/generated/copy.ts
//   build outputs (gitignored):
//     public/third-party-notices.txt (ADR-0008), src/generated/fonts/*.woff2 (ADR-0003 amendment)
// `pnpm gen:check` regenerates in memory and exits 1 if a committed file is stale.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenTokens, renderTokensCss, renderTokensTs } from './lib/tokens.ts';
import { parseCopy, renderCopyModule } from './lib/copy.ts';
import { renderDomainTypes } from './lib/domain-types.ts';
import { parseRegistry } from './lib/registry.ts';
import { readInstalledPackage, renderNotices } from './lib/notices.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const committed: Record<string, string> = {};
const tokens = await flattenTokens(JSON.parse(read('specs/30-experience/tokens.json')));
committed['src/generated/tokens.css'] = renderTokensCss(tokens);
committed['src/generated/tokens.ts'] = renderTokensTs(tokens);
committed['src/generated/domain.ts'] = await renderDomainTypes(
  JSON.parse(read('specs/10-domain/project.schema.json')),
  join(root, 'specs/10-domain'),
);
committed['src/generated/copy.ts'] = renderCopyModule(parseCopy(read('specs/30-experience/copy.md')));

let stale = 0;
for (const [path, text] of Object.entries(committed)) {
  const abs = join(root, path);
  const current = existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  if (current === text) continue;
  if (check) {
    console.error(`gen: ${path} is stale. Run "pnpm gen" and commit the result.`);
    stale++;
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text);
    console.log(`gen: wrote ${path}`);
  }
}
if (check) {
  if (stale) process.exit(1);
  console.log('gen: committed generated files are up to date');
  process.exit(0);
}

// Notices (build output).
const registry = parseRegistry(read('specs/40-technical/dependencies.md'));
writeFileSync(
  join(root, 'public/third-party-notices.txt'),
  renderNotices(registry, (name) => readInstalledPackage(root, name)),
);
console.log('gen: wrote public/third-party-notices.txt');

// Fonts (build output). Skipped when the subsetting script and its sources are unchanged.
const fontsrc = join(root, 'node_modules/@fontsource-variable');
const fontsOut = join(root, 'src/generated/fonts');
const stampFile = join(fontsOut, '.stamp');
const hash = createHash('sha256').update(read('scripts/subset-fonts.py'));
for (const family of ['manrope', 'unbounded', 'jetbrains-mono'])
  hash.update(readFileSync(join(fontsrc, family, 'package.json')));
const stamp = hash.digest('hex');
const fontsFresh =
  existsSync(stampFile) &&
  readFileSync(stampFile, 'utf8') === stamp &&
  readdirSync(fontsOut).filter((f) => f.endsWith('.woff2')).length === 5;
if (fontsFresh) {
  console.log('gen: fonts up to date');
} else {
  const venv = join(root, '.venv/bin/python');
  const python = process.env.PYTHON ?? (existsSync(venv) ? venv : 'python3');
  const r = spawnSync(python, [join(root, 'scripts/subset-fonts.py'), fontsrc, fontsOut], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('gen: font subsetting failed. Install the build tools: pip install -r requirements-build.txt');
    process.exit(1);
  }
  writeFileSync(stampFile, stamp);
}
