// MOD-Palette: the document event the bootstrap dispatches when the palette opens, so the island hydrates at once
// instead of waiting for idle time (directive.ts). Kept alone so the client directive bundles nothing else.
export const PALETTE_HYDRATE_EVENT = 'tarokit:palette-hydrate';
