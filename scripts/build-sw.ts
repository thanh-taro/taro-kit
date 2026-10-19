// `pnpm sw:build` (MOD-Offline, ADR-0004): after `astro build`, writes dist/sw.js with the precache list and prints
// the precache size. `node scripts/build-sw.ts [distDir]` (default dist).
import { join, resolve } from 'node:path';
import { buildServiceWorker, formatReport } from '../src/modules/offline/precache.ts';

const root = join(import.meta.dirname, '..');
const dist = resolve(root, process.argv[2] ?? 'dist');
try {
  console.log(formatReport(await buildServiceWorker(root, dist)));
} catch (e) {
  console.error(`sw: failed — ${(e as Error).message}`);
  process.exit(1);
}
