// Build-time virtual modules (Vite plugins registered in astro.config.ts).

/** MOD-Content: ids of this build's visible tools, alphabetical by name (RULE-06). */
declare module 'virtual:tarokit/visible-tool-ids' {
  export const visibleToolIds: readonly string[];
}

/** MOD-Content: the profile avatar as image metadata, or null when the profile has none (F-008.R1). */
declare module 'virtual:tarokit/avatar' {
  const avatar: import('astro').ImageMetadata | null;
  export default avatar;
}
