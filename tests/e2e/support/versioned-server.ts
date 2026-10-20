// A static host for the production build of the sample content (dist-samples/, `pnpm build:samples`) that can "publish a new version" mid-test (F-011.R4).
// - Serves files like the real host: clean URLs (`/tools/` → tools/index.html), and 404.html with status 404 for
//   anything else, with `no-cache` on HTML, sw.js and the manifest (ADR-0007).
// - `publish()` switches to version 2: every page carries `data-tk-e2e-version="2"` on <html>, and sw.js carries
//   new revisions for every page, as a deploy that changes the shared layout would. The browser sees a
//   byte-different sw.js and installs it as a waiting worker.
// It listens on an ephemeral port, so each test file gets its own origin, its own worker and no shared state.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const dist = join(import.meta.dirname, '../../../dist-samples');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

export interface VersionedHost {
  /** e.g. http://localhost:51234 */
  origin: string;
  /** Switches every following response to version 2. */
  publish(): void;
  close(): Promise<void>;
}

function resolve(pathname: string): string | null {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = join(dist, rel.endsWith('/') ? join(rel, 'index.html') : rel);
  return file.startsWith(dist) && existsSync(file) && statSync(file).isFile() ? file : null;
}

export async function startVersionedHost(): Promise<VersionedHost> {
  if (!existsSync(join(dist, 'sw.js'))) throw new Error('dist-samples/sw.js missing: run `pnpm build:samples` first');
  let version = 1;
  const server: Server = createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const found = resolve(pathname);
    const file = found ?? join(dist, '404.html');
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    let body: Buffer | string = readFileSync(file);
    if (version === 2 && type.startsWith('text/html'))
      body = body.toString('utf8').replace('<html lang="en"', '<html lang="en" data-tk-e2e-version="2"');
    if (version === 2 && pathname === '/sw.js')
      body = body.toString('utf8').replace(/"revision":"([0-9a-f]+)"/g, '"revision":"$1v2"');
    const revalidate = type.startsWith('text/html') || pathname === '/sw.js' || pathname.endsWith('.webmanifest');
    res.writeHead(found ? 200 : 404, {
      'Content-Type': type,
      'Cache-Control': revalidate ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  });
  await new Promise<void>((done) => server.listen(0, 'localhost', done));
  const { port } = server.address() as AddressInfo;
  return {
    origin: `http://localhost:${port}`,
    publish: () => void (version = 2),
    close: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
