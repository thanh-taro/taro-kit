// Astro 7, static output, Preact islands (ADR-0002); strict CSP (ADR-0009).
import preact from '@astrojs/preact';
import type { AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import {
  avatarPlugin,
  catalogDataPlugin,
  contentDirectory,
  ContentErrors,
  emitCatalogData,
  getRegistry,
  resetRegistry,
  visibleToolIdsPlugin,
} from './src/modules/content/index.ts';
import { CSP_DIRECTIVES, writeHeaders } from './src/modules/security-policy/index.ts';

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

// Tests-only pages (adapters/tests.md): `TAROKIT_FIXTURES=1` (only `pnpm build:fixtures` sets it) builds them
// into dist-fixtures/, never into dist/. `pnpm build` clears it and TAROKIT_CONTENT_DIR, and
// scripts/check-dist-clean.ts fails the build if fixture pages or content reach dist/.
// Playwright serves the fixture build on its own port (playwright.config.ts).
const fixtures = process.env.TAROKIT_FIXTURES === '1';
// E2E sample build (adapters/tests.md): `TAROKIT_SAMPLES=1` (only `pnpm build:samples` sets it) builds the production
// pages over tests/fixtures/content/samples into dist-samples/, so e2e tests never depend on content/ (release C-1).
const samples = !fixtures && process.env.TAROKIT_SAMPLES === '1';
const fixturePages: AstroIntegration = {
  name: 'tarokit:test-fixture-pages',
  hooks: {
    'astro:config:setup': ({ injectRoute }) => {
      injectRoute({
        pattern: '/__fixtures__/favorites',
        entrypoint: new URL('./tests/fixtures/pages/F005-favorites.astro', import.meta.url),
      });
      // F-006 recents: home's recents region and catalog cards (F-007 and F-002 build the real pages).
      injectRoute({
        pattern: '/__fixtures__/recents',
        entrypoint: new URL('./tests/fixtures/pages/F006-recents.astro', import.meta.url),
      });
      // F-007 home what's new over tools with chosen dates (F-007.AC6 to AC8).
      injectRoute({
        pattern: '/__fixtures__/whats-new',
        entrypoint: new URL('./tests/fixtures/pages/F007-whats-new.astro', import.meta.url),
      });
      // F-002 SCR-Catalog's empty state (tests/fixtures/content/F010_AC6-no-note-no-tools).
      injectRoute({
        pattern: '/__fixtures__/catalog-empty',
        entrypoint: new URL('./tests/fixtures/pages/F002-catalog-empty.astro', import.meta.url),
      });
      // F-010 SCR-Now states without a Now note (tests/fixtures/content/F010_*).
      for (const state of ['now-no-note', 'now-empty'])
        injectRoute({
          pattern: `/__fixtures__/${state}`,
          entrypoint: new URL('./tests/fixtures/pages/F010-now.astro', import.meta.url),
        });
    },
  },
};

// MOD-SecurityPolicy: `_headers` next to the pages (ADR-0009 response headers, ADR-0007), after every build.
const securityHeaders: AstroIntegration = {
  name: 'tarokit:security-headers',
  hooks: {
    'astro:build:done': ({ dir }) => writeHeaders(getRegistry(), fileURLToPath(dir)),
  },
};

// MOD-Palette: `client:palette`, idle hydration that also starts at once when the palette opens (directive.ts).
const paletteDirective: AstroIntegration = {
  name: 'tarokit:palette-directive',
  hooks: {
    'astro:config:setup': ({ addClientDirective }) =>
      addClientDirective({
        name: 'palette',
        entrypoint: fileURLToPath(new URL('./src/modules/palette/directive.ts', import.meta.url)),
      }),
  },
};

// MOD-Content: the hashed catalog data file `/data/catalog.<hash>.json` that islands fetch (ADR-0002, F-002).
const catalogDataEmit: AstroIntegration = {
  name: 'tarokit:catalog-data',
  hooks: {
    'astro:build:done': ({ dir }) => void emitCatalogData(getRegistry(), fileURLToPath(dir)),
  },
};

export default defineConfig({
  site: portalOrigin,
  output: 'static',
  outDir: fixtures ? './dist-fixtures' : samples ? './dist-samples' : './dist',
  trailingSlash: 'always',
  // Silences the syntax-highlighter-vs-CSP warning: no Markdown pages are rendered.
  markdown: { syntaxHighlight: false },
  integrations: [preact(), paletteDirective, securityHeaders, catalogDataEmit, ...(fixtures ? [fixturePages] : [])],
  vite: {
    // workbox-window has no `exports` map, so Node would load its UMD build during dev server rendering and the
    // named `Workbox` import fails. Bundling it uses its ES module build, as the production build already does.
    ssr: { noExternal: ['workbox-window'] },
    // MOD-Content: `virtual:tarokit/visible-tool-ids` for islands (RULE-02, INV-04).
    plugins: [
      visibleToolIdsPlugin({
        ids: () => getRegistry().visibleTools.map((t) => t.id),
        contentDir: contentDirectory(),
        onContentChange: resetRegistry,
      }),
      // MOD-Content: `virtual:tarokit/avatar`, the registry's validated avatar file for Astro's image pipeline
      // (F-008.R1).
      avatarPlugin({ file: () => getRegistry().avatarFile, contentDir: contentDirectory() }),
      // MOD-Content: serves the catalog data file in dev; the build writes it (catalogDataEmit above).
      catalogDataPlugin(getRegistry),
    ],
  },
  security: {
    csp: {
      directives: [...CSP_DIRECTIVES],
    },
  },
});
