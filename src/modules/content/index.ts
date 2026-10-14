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
  WHATS_NEW_DAYS,
  WHATS_NEW_MAX,
  whatsNew,
  type ChangelogMonth,
  type DatedItem,
} from './derive.ts';
