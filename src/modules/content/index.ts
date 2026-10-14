// MOD-Content public surface (specs/40-technical/modules/MOD-Content.md).
export { ContentErrors, formatError, type ContentError } from './errors.ts';
export {
  getRegistry,
  loadRegistry,
  PORTAL_ORIGIN,
  type ChangelogEvent,
  type LoadOptions,
  type RegCategory,
  type RegProject,
  type RegTool,
  type Registry,
} from './registry.ts';
export { catalogData, type CatalogData, type CatalogProject, type CatalogTool } from './catalog-data.ts';
export {
  categoryPath,
  changelog,
  changelogItems,
  PUBLIC_PAGES,
  sitemapEntries,
  toolPath,
  toolsByCategory,
  visibleCategories,
  visibleTools,
  type ChangelogMonth,
  type Dated,
  type DatedItem,
} from './derive.ts';
export { VISIBLE_TOOL_IDS_MODULE, visibleToolIdsPlugin, visibleToolIdsSource } from './visible-tool-ids.ts';
