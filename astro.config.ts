// Astro 7, static output, Preact islands (ADR-0002); strict CSP (ADR-0009).
import preact from '@astrojs/preact';
import type { AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';
import {
  contentDirectory,
  ContentErrors,
  getRegistry,
  resetRegistry,
  visibleToolIdsPlugin,
} from './src/modules/content/index.ts';
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

// Tests-only pages (adapters/tests.md): `TAROKIT_FIXTURES=1` builds them into dist-fixtures/, never into
// dist/. Playwright serves that build on its own port (playwright.config.ts).
const fixtures = process.env.TAROKIT_FIXTURES === '1';
const fixturePages: AstroIntegration = {
  name: 'tarokit:test-fixture-pages',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/__fixtures__/favorites',
        entrypoint: new URL('./tests/fixtures/pages/F005-favorites.astro', import.meta.url),
      });
    },
  },
};

export default defineConfig({
  site: portalOrigin,
  output: 'static',
  outDir: fixtures ? './dist-fixtures' : './dist',
  trailingSlash: 'always',
  // Silences the syntax-highlighter-vs-CSP warning: no Markdown pages are rendered.
  markdown: { syntaxHighlight: false },
  integrations: [preact(), ...(fixtures ? [fixturePages] : [])],
  vite: {
    // MOD-Content: `virtual:tarokit/visible-tool-ids` for islands (RULE-02, INV-04).
    plugins: [
      visibleToolIdsPlugin({
        ids: () => getRegistry().visibleTools.map((t) => t.id),
        contentDir: contentDirectory(),
        onContentChange: resetRegistry,
      }),
    ],
  },
  security: {
    csp: {
      directives: [...CSP_DIRECTIVES],
    },
  },
});
