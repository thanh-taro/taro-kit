// Custom Astro client directives (astro.config.ts `addClientDirective`).
export {};

declare module 'astro' {
  interface AstroClientDirectives {
    /** MOD-Palette: hydrate at idle time, or at once when the palette opens (src/modules/palette/directive.ts). */
    'client:palette'?: boolean;
  }
}
