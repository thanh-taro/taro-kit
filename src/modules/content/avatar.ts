// MOD-Content: the profile avatar as a build-time module. Pages import `virtual:tarokit/avatar`; its default
// export is the avatar file imported from the content folder, so Astro's image pipeline turns it into image
// metadata and optimizes it (DEP-31), or `null` when the profile has none (initials are shown, F-008.R1).
// The registry has already checked that the file exists (ADR-0005). In dev, content edits rebuild the module.
// Implements: F-008.R1 (avatar).
import { sep } from 'node:path';
import type { DevServerLike } from './visible-tool-ids.ts';

export const AVATAR_MODULE = 'virtual:tarokit/avatar';
const RESOLVED = `\0${AVATAR_MODULE}`;

/** The source of the virtual module, for an absolute avatar file path or none. */
export const avatarSource = (file: string | undefined): string =>
  file ? `export { default } from ${JSON.stringify(file)};\n` : 'export default null;\n';

export interface AvatarOptions {
  /** The avatar's absolute file path, or undefined when the profile has none (from the registry). */
  file: () => string | undefined;
  /** The content folder to watch in dev. */
  contentDir: string;
}

/** A Vite plugin serving `virtual:tarokit/avatar`, kept fresh in dev. */
export function avatarPlugin({ file, contentDir }: AvatarOptions) {
  return {
    name: 'tarokit:avatar',
    resolveId: (id: string) => (id === AVATAR_MODULE ? RESOLVED : undefined),
    load: (id: string) => (id === RESOLVED ? avatarSource(file()) : undefined),
    configureServer(server: DevServerLike) {
      // The visible-tool-ids plugin resets the registry and reloads the page; this one forgets its module.
      const onFile = (path: string) => {
        // Inside the content folder only: "content-old/x" must not match "content".
        if (!path.startsWith(contentDir + sep)) return;
        const graphs = server.environments
          ? Object.values(server.environments).map((e) => e.moduleGraph)
          : server.moduleGraph
            ? [server.moduleGraph]
            : [];
        for (const graph of graphs) {
          const mod = graph.getModuleById(RESOLVED);
          if (mod) graph.invalidateModule(mod as never);
        }
      };
      for (const event of ['add', 'change', 'unlink']) server.watcher.on(event, onFile);
    },
  };
}
