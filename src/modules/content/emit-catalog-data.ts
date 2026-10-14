// MOD-Content: the hashed catalog data file that islands fetch (ADR-0002): `/data/catalog.<hash>.json`.
// The payload is `catalogData()` (visible entries only, RULE-06) with MOD-Search's pre-normalized keys on each
// tool and project, so a keystroke costs one linear pass in the browser (NFR-02).
// - `catalogDataFile(registry)`: the file's address, hash and JSON, pure; pages pass the address to islands.
// - `emitCatalogData(registry, outDir)`: writes it into the build output (astro.config.ts, after the build).
// - `catalogDataPlugin()`: serves the same file in dev, so search works there too.
// Node only (hashing and file writes); the browser only reads the JSON.
// Implements: F-001.R4 (no hidden entries), supplies F-002.R4 and F-004.R3.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { searchKeys, type SearchKeys } from '../search/index.ts';
import { catalogData, type CatalogData, type CatalogProject, type CatalogTool } from './catalog-data.ts';
import type { Registry } from './registry.ts';

export type IndexedTool = CatalogTool & { keys: SearchKeys };
export type IndexedProject = CatalogProject & { keys: SearchKeys };
/** The catalog data file's content: the catalog data payload with search keys. */
export interface CatalogDataFileContent extends Omit<CatalogData, 'tools' | 'projects'> {
  tools: IndexedTool[];
  projects: IndexedProject[];
}

export interface CatalogDataFile {
  /** The portal address, `/data/catalog.<hash>.json`. */
  path: string;
  /** The first 10 hex digits of the content's SHA-256. */
  hash: string;
  json: string;
}

type RegistryPart = Pick<Registry, 'categories' | 'visibleTools' | 'projects'>;

export function catalogDataFile(registry: RegistryPart): CatalogDataFile {
  const data = catalogData(registry);
  const content: CatalogDataFileContent = {
    categories: data.categories,
    tools: data.tools.map((t) => ({ ...t, keys: searchKeys(t) })),
    projects: data.projects.map((p) => ({ ...p, keys: searchKeys(p) })),
  };
  const json = JSON.stringify(content);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 10);
  return { path: `/data/catalog.${hash}.json`, hash, json };
}

/** Writes the catalog data file under `outDir` and returns its address and hash. */
export function emitCatalogData(registry: RegistryPart, outDir: string): { path: string; hash: string } {
  const { path, hash, json } = catalogDataFile(registry);
  const file = join(outDir, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, json);
  return { path, hash };
}

interface DevServer {
  middlewares: {
    use(fn: (req: { url?: string }, res: DevResponse, next: () => void) => void): void;
  };
}
interface DevResponse {
  setHeader(name: string, value: string): void;
  end(body: string): void;
}

/** A Vite plugin serving the current catalog data file in dev (the build writes it with `emitCatalogData`). */
export function catalogDataPlugin(registry: () => RegistryPart) {
  return {
    name: 'tarokit:catalog-data',
    configureServer(server: DevServer) {
      server.middlewares.use((req, res, next) => {
        const file = catalogDataFile(registry());
        if (req.url?.split('?')[0] !== file.path) return next();
        res.setHeader('Content-Type', 'application/json');
        res.end(file.json);
      });
    },
  };
}
