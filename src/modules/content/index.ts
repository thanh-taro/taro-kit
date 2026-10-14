// MOD-Content public surface (specs/40-technical/modules/MOD-Content.md).
export { assetFile, AVATAR_TYPES, IMAGE_TYPES, imageType, resolveAsset, type AssetSite } from './assets.ts';
export { ContentErrors, formatError, type ContentError } from './errors.ts';
export {
  contentDirectory,
  getRegistry,
  resetRegistry,
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
  projectPath,
  PUBLIC_PAGES,
  sitemapEntries,
  toolPath,
  toolsByCategory,
  visibleCategories,
  visibleProjects,
  visibleTools,
  type ChangelogMonth,
  type Dated,
  type DatedItem,
} from './derive.ts';
export {
  RESOLVED_VISIBLE_TOOL_IDS_MODULE,
  VISIBLE_TOOL_IDS_MODULE,
  visibleToolIdsPlugin,
  visibleToolIdsSource,
  type DevServerLike,
} from './visible-tool-ids.ts';
export { initials, paragraphs, profileLinks, type ProfileLink } from './profile.ts';
export { AVATAR_MODULE, avatarPlugin, avatarSource } from './avatar.ts';
