// Astro 7, static output, Preact islands (ADR-0002); strict CSP (ADR-0009).
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';
import { ContentErrors, getRegistry } from './src/modules/content/index.ts';
import { CSP_DIRECTIVES } from './src/modules/security-policy/index.ts';

// Content is validated before Astro does anything else, so bad content fails the build at once
// with the domain error list (MOD-Content, F-001.R2).
let portalOrigin: string;
try {
  portalOrigin = getRegistry().portalOrigin;
} catch (e) {
  if (e instanceof ContentErrors) {
    console.error(`\n${e.message}\n`);
    process.exit(1);
  }
  throw e;
}

export default defineConfig({
  site: portalOrigin,
  output: 'static',
  trailingSlash: 'always',
  // Silences the syntax-highlighter-vs-CSP warning: no Markdown pages are rendered.
  markdown: { syntaxHighlight: false },
  integrations: [preact()],
  security: {
    csp: {
      directives: [...CSP_DIRECTIVES],
    },
  },
});
