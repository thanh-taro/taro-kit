// Build-time virtual modules (Vite plugins registered in astro.config.ts).

/** MOD-Content: ids of this build's visible tools, alphabetical by name (RULE-06). */
declare module 'virtual:tarokit/visible-tool-ids' {
  export const visibleToolIds: readonly string[];
}
