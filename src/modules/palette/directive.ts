// MOD-Palette client directive `client:palette` (registered in astro.config.ts): like `client:idle`, and also at
// once when the palette opens (PALETTE_HYDRATE_EVENT from the bootstrap), so a shortcut pressed before idle time
// gets a working palette as soon as the island's code arrives (NFR-02, F-004.R1).
import type { ClientDirective } from 'astro';
import { PALETTE_HYDRATE_EVENT } from './events.ts';

const palette: ClientDirective = (load) => {
  let started = false;
  const go = async () => {
    if (started) return;
    started = true;
    document.removeEventListener(PALETTE_HYDRATE_EVENT, go);
    const hydrate = await load();
    await hydrate();
  };
  document.addEventListener(PALETTE_HYDRATE_EVENT, go);
  if ('requestIdleCallback' in window) window.requestIdleCallback(() => void go());
  else setTimeout(() => void go(), 200);
};

export default palette;
