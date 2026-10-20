// MOD-Delivery home transfer-size gate (NFR-11): scripts/check-dist-size.ts over a scratch dist/.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const script = join(import.meta.dirname, '../../scripts/check-dist-size.ts');
let dir: string;
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function dist(files: Record<string, string | Buffer>): string {
  dir = mkdtempSync(join(tmpdir(), 'tk-size-'));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}
const run = (d: string) => spawnSync(process.execPath, [script, d], { encoding: 'utf8' });

describe('NFR-11 home transfer-size gate', () => {
  it('NFR-11 passes a small home and counts its scripts, the modules they import and the fonts its CSS loads', () => {
    const d = dist({
      'index.html': '<link rel="stylesheet" href="/_astro/a.css"><script type="module" src="/_astro/a.js"></script>',
      '_astro/a.css': '@font-face{src:url(/_astro/f.woff2)}',
      '_astro/a.js': 'import"./b.js";',
      '_astro/b.js': 'export const b=1;',
      '_astro/f.woff2': randomBytes(1000),
    });
    const r = run(d);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/5 files/);
  });

  it('NFR-11 fails when the home initial transfer is over 200 KB compressed', () => {
    const d = dist({
      'index.html': '<script type="module" src="/_astro/big.js"></script>',
      '_astro/big.js': randomBytes(210 * 1024).toString('base64'),
    });
    const r = run(d);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/over NFR-11/);
  });

  it('NFR-11 leaves out the avatar image and page links', () => {
    const d = dist({
      'index.html': '<img src="/_astro/avatar.abc.jpg"><a href="/about/">About</a>',
      '_astro/avatar.abc.jpg': randomBytes(300 * 1024),
    });
    expect(run(d).status).toBe(0);
  });
});
