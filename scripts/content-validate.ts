// `pnpm content:validate` (MOD-Content CLI): validate content/ against the domain schema and invariants.
// Exits 1 with one `file:line › entry › rule: message` line per error (F-001.R2).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentErrors, loadRegistry } from '../src/modules/content/index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = performance.now();
try {
  const r = loadRegistry({ root });
  const hidden = r.allTools.filter((t) => t.hidden).length;
  console.log(
    `content: ok — ${r.allTools.length} tools (${hidden} hidden), ${r.projects.length} visible projects, ` +
      `${r.categories.length} visible categories (${(performance.now() - t0).toFixed(0)} ms)`,
  );
} catch (e) {
  if (!(e instanceof ContentErrors)) throw e;
  console.error(e.message);
  process.exit(1);
}
