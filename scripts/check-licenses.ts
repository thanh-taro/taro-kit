// `pnpm licenses:check` (ADR-0008): every installed package's license must be allowed for its scope.
// Scope comes from the registry (specs/40-technical/dependencies.md), not from the production tree.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenPnpmLicenses, judge } from './lib/licenses.ts';
import { parseRegistry } from './lib/registry.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rows = parseRegistry(readFileSync(join(root, 'specs/40-technical/dependencies.md'), 'utf8'));
const raw = execFileSync('pnpm', ['licenses', 'list', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const pkgs = flattenPnpmLicenses(JSON.parse(raw));

const failures = pkgs.map((p) => ({ p, v: judge(p, rows) })).filter(({ v }) => !v.ok);
const exceptions = pkgs.map((p) => ({ p, v: judge(p, rows) })).filter(({ v }) => v.ok && v.reason !== 'permissive');

for (const { p, v } of exceptions) console.log(`licenses: exception ${p.name}@${p.versions.join(',')} — ${v.reason}`);
if (failures.length) {
  for (const { p, v } of failures) console.error(`licenses: FAIL ${p.name}@${p.versions.join(',')} — ${v.reason}`);
  process.exit(1);
}
console.log(`licenses: ok — ${pkgs.length} packages checked, ${exceptions.length} registered build/dev exceptions`);
