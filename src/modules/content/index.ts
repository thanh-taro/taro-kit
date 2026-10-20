// MOD-Content public surface (specs/40-technical/modules/MOD-Content.md).
export { assetFile, AVATAR_TYPES, IMAGE_TYPES, imageType, resolveAsset, type AssetSite } from './assets.ts';
export { ContentErrors, formatError, type ContentError } from './errors.ts';
export {
  contentDirectory,
  getRegistry,
  resetRegistry,
  loadRegistry,
  PORTAL_ORIGIN,
  portalOriginFor,
  type ChangelogEvent,
  type LoadOptions,
  type RegCategory,
  type RegTool,
  type Registry,
} from './registry.ts';
export { catalogData, type CatalogData, type CatalogTool } from './catalog-data.ts';
export {
  catalogDataFile,
  catalogDataPlugin,
  emitCatalogData,
  type CatalogDataFile,
  type CatalogDataFileContent,
  type IndexedTool,
} from './emit-catalog-data.ts';
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
export {
  RESOLVED_VISIBLE_TOOL_IDS_MODULE,
  VISIBLE_TOOL_IDS_MODULE,
  visibleToolIdsPlugin,
  visibleToolIdsSource,
  type DevServerLike,
} from './visible-tool-ids.ts';
export { initials, paragraphs, profileLinks, type ProfileLink } from './profile.ts';
export {
  hasResumeEntries,
  RESUME_PATH,
  RESUME_SECTIONS,
  resumeEntryName,
  resumePeriodErrors,
  type ResumePeriodError,
  type ResumeSection,
} from './resume.ts';
export { AVATAR_MODULE, avatarPlugin, avatarSource } from './avatar.ts';
