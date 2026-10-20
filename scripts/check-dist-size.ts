// dist/ home transfer-size gate (MOD-Delivery, NFR-11): the home page's initial transfer, brotli-compressed as the
// host serves it, must be at most 200 KB, excluding the avatar image. It also reports the architecture budget
// (170 KB total). Counted: the home HTML and every same-origin file it references (stylesheets, scripts, preloads,
// icons, manifest, island component and renderer modules), plus the JS modules those import, transitively.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, process.argv[2] ?? 'dist');
const LIMIT = 200 * 1024; // NFR-11
const TARGET = 170 * 1024; // architecture.md "Total initial transfer"

const brotli = (buf: Buffer) => brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

/** Same-origin file paths referenced by the home HTML (no page links, no avatar). */
function htmlRefs(html: string): string[] {
  const refs = new Set<string>();
  const attr = /\b(?:src|href|component-url|renderer-url|before-hydration-url)="([^"]+)"/g;
  for (const m of html.matchAll(attr)) {
    const url = m[1]!;
    if (/^(https?:|mailto:|data:|#)/.test(url) || !url.startsWith('/')) continue;
    const path = url.split(/[?#]/)[0]!;
    if (path.endsWith('/')) continue; // a page link, not part of the initial transfer
    if (/avatar/i.test(path)) continue; // NFR-11 excludes the avatar
    refs.add(path);
  }
  return [...refs];
}

/** Relative and absolute module specifiers a built JS file imports (static and dynamic). */
function jsImports(code: string, from: string): string[] {
  const out: string[] = [];
  const spec = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+\.m?js)["']/g;
  for (const m of code.matchAll(spec)) {
    const s = m[1]!;
    if (s.startsWith('/')) out.push(s);
    else if (s.startsWith('.')) out.push(posix.normalize(posix.join(posix.dirname(from), s)));
  }
  return out;
}

/** Same-origin files a stylesheet loads with url() (fonts, images). The browser fetches a font face only when
 * text uses it, so this is an upper bound. */
function cssUrls(css: string, from: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const u = m[1]!.split(/[?#]/)[0]!;
    if (/^(https?:|data:)/.test(u) || /avatar/i.test(u)) continue;
    out.push(u.startsWith('/') ? u : posix.normalize(posix.join(posix.dirname(from), u)));
  }
  return out;
}

const home = join(dist, 'index.html');
if (!existsSync(home)) {
  console.error(`size: ${home} not found; run the build first`);
  process.exit(1);
}

const html = readFileSync(home);
const sizes = new Map<string, number>([['/index.html', brotli(html)]]);
const queue = htmlRefs(html.toString('utf8'));
while (queue.length > 0) {
  const path = queue.shift()!;
  if (sizes.has(path)) continue;
  const file = join(dist, path);
  if (!existsSync(file)) continue; // served by the host or generated elsewhere; not in dist
  const buf = readFileSync(file);
  sizes.set(path, brotli(buf));
  if (/\.m?js$/.test(path)) queue.push(...jsImports(buf.toString('utf8'), path));
  if (path.endsWith('.css')) queue.push(...cssUrls(buf.toString('utf8'), path));
}

const total = [...sizes.values()].reduce((a, b) => a + b, 0);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const byKind = new Map<string, number>();
for (const [path, n] of sizes) {
  const kind = /\.m?js$/.test(path) ? 'js' : (/\.(\w+)$/.exec(path)?.[1] ?? 'other');
  byKind.set(kind, (byKind.get(kind) ?? 0) + n);
}
const breakdown = [...byKind].map(([k, n]) => `${k} ${kb(n)}`).join(', ');

if (total > LIMIT) {
  console.error(`size: home initial transfer ${kb(total)} is over NFR-11's ${kb(LIMIT)} (${breakdown})`);
  process.exit(1);
}
const note = total > TARGET ? ` — over the ${kb(TARGET)} architecture target` : '';
console.log(`size: ok — home initial transfer ${kb(total)} brotli, ${sizes.size} files (${breakdown})${note}`);
