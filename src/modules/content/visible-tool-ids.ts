// MOD-Content: the visible tool ids for islands, as a build-time module (ADR-0002: islands get catalog data
// from hashed build output, not from per-page props). Islands import `virtual:tarokit/visible-tool-ids`;
// Vite bundles it into a hashed chunk, so it costs no page HTML and is cached with the islands.
// The ids come from the registry's `visibleTools` (RULE-06): hidden entries never reach the browser.
// MOD-PersonalData uses them for RULE-02 (the visible limit) and INV-04 (what may be shown).
// In dev, editing content reloads the registry, rebuilds the module and reloads the page.
// Implements: F-001.R4; supplies F-005.R3 and F-005.R4.

export const VISIBLE_TOOL_IDS_MODULE = 'virtual:tarokit/visible-tool-ids';
export const RESOLVED_VISIBLE_TOOL_IDS_MODULE = `\0${VISIBLE_TOOL_IDS_MODULE}`;

/** The source of the virtual module: `export const visibleToolIds = [...]`. */
export const visibleToolIdsSource = (ids: readonly string[]): string =>
  `export const visibleToolIds = ${JSON.stringify(ids)};\n`;

/** The parts of a Vite dev server the plugin uses (typed structurally: Vite is not a direct dependency). */
interface ModuleGraphLike {
  getModuleById(id: string): unknown;
  invalidateModule(mod: never): void;
}
export interface DevServerLike {
  watcher: { add(path: string): unknown; on(event: string, cb: (path: string) => void): unknown };
  moduleGraph?: ModuleGraphLike;
  environments?: Record<string, { moduleGraph: ModuleGraphLike }>;
  ws: { send(payload: { type: 'full-reload'; path?: string }): void };
}

export interface VisibleToolIdsOptions {
  /** The current visible tool ids (from the registry). */
  ids: () => readonly string[];
  /** The content folder to watch in dev. */
  contentDir: string;
  /** Called before the module is rebuilt after a content edit (clears the registry cache). */
  onContentChange: () => void;
}

/** A Vite plugin serving the virtual module from the registry's visible tools, kept fresh in dev. */
export function visibleToolIdsPlugin({ ids, contentDir, onContentChange }: VisibleToolIdsOptions) {
  return {
    name: 'tarokit:visible-tool-ids',
    resolveId: (id: string) => (id === VISIBLE_TOOL_IDS_MODULE ? RESOLVED_VISIBLE_TOOL_IDS_MODULE : undefined),
    load: (id: string) => (id === RESOLVED_VISIBLE_TOOL_IDS_MODULE ? visibleToolIdsSource(ids()) : undefined),
    configureServer(server: DevServerLike) {
      server.watcher.add(contentDir);
      const onFile = (path: string) => {
        if (!path.startsWith(contentDir)) return;
        onContentChange();
        const graphs = server.environments
          ? Object.values(server.environments).map((e) => e.moduleGraph)
          : server.moduleGraph
            ? [server.moduleGraph]
            : [];
        for (const graph of graphs) {
          const mod = graph.getModuleById(RESOLVED_VISIBLE_TOOL_IDS_MODULE);
          if (mod) graph.invalidateModule(mod as never);
        }
        server.ws.send({ type: 'full-reload' });
      };
      for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, onFile);
    },
  };
}
