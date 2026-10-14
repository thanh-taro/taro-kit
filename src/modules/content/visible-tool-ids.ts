// MOD-Content: the visible tool ids for islands, as a build-time module (ADR-0002: islands get catalog data
// from hashed build output, not from per-page props). Islands import `virtual:tarokit/visible-tool-ids`;
// Vite bundles it into a hashed chunk, so it costs no page HTML and is cached with the islands.
// The ids come from the registry's `visibleTools` (RULE-06): hidden entries never reach the browser.
// MOD-PersonalData uses them for RULE-02 (the visible limit) and INV-04 (what may be shown).
// Implements: F-001.R4; supplies F-005.R3 and F-005.R4.

export const VISIBLE_TOOL_IDS_MODULE = 'virtual:tarokit/visible-tool-ids';
const RESOLVED = `\0${VISIBLE_TOOL_IDS_MODULE}`;

/** The source of the virtual module: `export const visibleToolIds = [...]`. */
export const visibleToolIdsSource = (ids: readonly string[]): string =>
  `export const visibleToolIds = ${JSON.stringify(ids)};\n`;

/** A Vite plugin serving the virtual module from the registry's visible tools. */
export function visibleToolIdsPlugin(ids: () => readonly string[]) {
  return {
    name: 'tarokit:visible-tool-ids',
    resolveId: (id: string) => (id === VISIBLE_TOOL_IDS_MODULE ? RESOLVED : undefined),
    load: (id: string) => (id === RESOLVED ? visibleToolIdsSource(ids()) : undefined),
  };
}
