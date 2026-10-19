// MOD-Offline post-build step (ADR-0004, spike SP-4): bundle src/sw/sw.ts, then inject the precache list over the
// finished build with workbox-build (DEP-11). It runs after `astro build`, so it sees every file the build wrote,
// including `astro:build:done` output such as /data/catalog.<hash>.json (MOD-Content).
// Precached: every page (404.html included), all CSS, JS and fonts, the catalog data file, the manifest and icons,
// the avatar and project images: "every portal page and all catalog content" (NFR-06).
// Not precached: sw.js itself, host config and files no page loads.
// Node only (build); the CLI is scripts/build-sw.ts (`pnpm sw:build`).
import { readFileSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { getManifest, injectManifest } from 'workbox-build';

/** The part of Vite's build API this step uses (Vite has no types of its own here: it is not a direct dependency). */
type ViteBuild = (config: Record<string, unknown>) => Promise<unknown>;

/** Astro's own Vite (ADR-0004: bundled with Vite's build API); Vite comes with Astro (DEP-01), not directly. */
async function viteBuild(): Promise<ViteBuild> {
  const fromAstro = createRequire(createRequire(import.meta.url).resolve('astro/package.json'));
  const vite = (await import(pathToFileURL(fromAstro.resolve('vite')).href)) as { build: ViteBuild };
  return vite.build;
}

/** Requests in flight while a new worker installs (SP-4: 6 cut a 500-tool install from 84 s to 28 s on slow 4G). */
export const PRECACHE_CONCURRENCY = 6;

export const PRECACHE_PATTERNS = ['**/*.{html,js,css,woff2,json,webmanifest,png,jpg,jpeg,webp,avif,gif,svg}'];
export const PRECACHE_IGNORES = ['sw.js', '_headers', 'sitemap*.xml', 'robots.txt', '*.txt', '**/*.map'];

const globConfig = (distDir: string) => ({
  globDirectory: distDir,
  globPatterns: PRECACHE_PATTERNS,
  globIgnores: PRECACHE_IGNORES,
  // Hashed file names change with their content, so they need no revision (ADR-0002 `/_astro/`).
  dontCacheBustURLsMatching: /^_astro\//,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
});

export interface PrecacheEntry {
  url: string;
  revision: string | null;
}

/** The precache list for a build directory, without writing anything. */
export async function precacheEntries(distDir: string): Promise<PrecacheEntry[]> {
  const { manifestEntries, warnings } = await getManifest(globConfig(distDir));
  if (warnings.length) throw new Error(`precache: ${warnings.join('; ')}`);
  return (manifestEntries ?? []).map(({ url, revision }) => ({ url, revision: revision ?? null }));
}

export interface PrecacheReport {
  entries: number;
  rawBytes: number;
  gzipBytes: number;
  brotliBytes: number;
  pages: number;
  images: number;
  swBytes: number;
}

/** Bundles the worker into `<distDir>/sw.js` with its precache list, and measures the precache. */
export async function buildServiceWorker(root: string, distDir: string): Promise<PrecacheReport> {
  const tmp = join(root, 'node_modules/.tarokit-sw');
  rmSync(tmp, { recursive: true, force: true });
  const build = await viteBuild();
  await build({
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    define: {
      'process.env.NODE_ENV': '"production"',
      __PRECACHE_CONCURRENCY__: String(PRECACHE_CONCURRENCY),
    },
    build: {
      outDir: tmp,
      emptyOutDir: true,
      minify: true,
      target: 'es2022',
      copyPublicDir: false,
      lib: { entry: join(root, 'src/sw/sw.ts'), formats: ['iife'], name: 'tarokitSw', fileName: () => 'sw.js' },
    },
  });
  const { count, size, warnings } = await injectManifest({
    swSrc: join(tmp, 'sw.js'),
    swDest: join(distDir, 'sw.js'),
    ...globConfig(distDir),
  });
  if (warnings.length) throw new Error(`precache: ${warnings.join('; ')}`);
  rmSync(tmp, { recursive: true, force: true });

  let gzipBytes = 0;
  let brotliBytes = 0;
  let pages = 0;
  let images = 0;
  for (const { url } of await precacheEntries(distDir)) {
    const buf = readFileSync(join(distDir, url));
    gzipBytes += gzipSync(buf, { level: 9 }).length;
    brotliBytes += brotliCompressSync(buf).length;
    if (url.endsWith('.html')) pages++;
    if (/\.(png|jpe?g|webp|avif|gif|svg)$/.test(url)) images++;
  }
  return {
    entries: count,
    rawBytes: size,
    gzipBytes,
    brotliBytes,
    pages,
    images,
    swBytes: statSync(join(distDir, 'sw.js')).size,
  };
}

/** One line for the build log. */
export function formatReport(r: PrecacheReport): string {
  const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
  return (
    `sw: ok — ${r.entries} precache entries (${r.pages} pages, ${r.images} images): ` +
    `${kb(r.rawBytes)} raw, ${kb(r.gzipBytes)} gzip, ${kb(r.brotliBytes)} brotli; sw.js ${kb(r.swBytes)}`
  );
}
