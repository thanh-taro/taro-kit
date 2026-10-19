// `pnpm catalog:check` (MOD-CatalogCheck CLI, F-014): checks every visible tool, project link and
// profile link before publishing and weekly. Flags: --weekly, --json, --portal-origin <origin>.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../src/modules/catalog-check/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.exitCode = await runCli(process.argv.slice(2), {
  root,
  env: process.env,
  out: (l) => console.log(l),
  err: (l) => console.error(l),
});
