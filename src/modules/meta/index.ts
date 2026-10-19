// MOD-Meta public surface (specs/40-technical/modules/MOD-Meta.md): page metadata, head tags, the site index,
// robots.txt and the shared preview image. Everything here is pure; HeadMeta.astro renders the tags and the
// static endpoints (src/pages/sitemap.xml.ts, robots.txt.ts, preview.png.ts) write the files.
export {
  headTags,
  MAX_DESCRIPTION,
  MAX_TITLE,
  metaFor,
  PREVIEW_IMAGE,
  type HeadTag,
  type MetaRegistry,
  type MetaRoute,
  type PageMeta,
} from './meta.ts';
export { previewGlyphRequest, previewSvg, type GlyphRun, type GlyphRuns } from './preview-image.ts';
export { robotsTxt, siteIndexXml } from './site-index.ts';
