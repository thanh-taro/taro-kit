// MOD-Meta: each page's link-preview metadata (specs/40-technical/modules/MOD-Meta.md). Pure: no Node imports.
// Implements: F-015.R1, F-015.R2, F-015.R4, F-015.R5, F-017.R6, NFR-12.
import { categoryPath, toolPath } from '../content/derive.ts';
import { RESUME_PATH } from '../content/resume.ts';
import { t } from '../copy/index.ts';

/** The pages that declare previews (routes per MOD-Pages). */
export type MetaRoute =
  | { page: 'home' | 'tools' | 'about' | 'resume' | 'now' | 'settings' | 'notFound' }
  | { page: 'category'; id: string }
  | { page: 'tool'; id: string };

/** What a page declares; spread into `<BaseLayout>` (MOD-Shell). */
export interface PageMeta {
  title: string;
  description: string;
  /** The page's portal path, e.g. "/about/". */
  path: string;
  /** Kept out of search results (the not-found page, F-015.R4). */
  noindex?: boolean;
}

/** The registry views metaFor reads: visible tools by id, and visible categories (RULE-06). */
export interface MetaRegistry {
  toolById(id: string): { name: string; summary: string; hidden: boolean } | undefined;
  categories: readonly { id: string; name: string; intro: string }[];
}

/** The shared portal preview image (NFR-12, F-015 scope: one image in M-1). */
export const PREVIEW_IMAGE = { path: '/preview.png', width: 1200, height: 630, type: 'image/png' } as const;

/** NFR-12 limits. */
export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 160;

const STATIC: Record<Exclude<MetaRoute['page'], 'category' | 'tool' | 'notFound'>, PageMeta> = {
  home: { title: t('COPY-meta.homeTitle'), description: t('COPY-meta.homeDescription'), path: '/' },
  tools: { title: t('COPY-meta.toolsTitle'), description: t('COPY-meta.toolsDescription'), path: '/tools/' },
  about: { title: t('COPY-meta.aboutTitle'), description: t('COPY-meta.aboutDescription'), path: '/about/' },
  // F-017.R6: the Résumé page exists only when there is a résumé (MOD-Pages), so only then is this declared.
  resume: { title: t('COPY-meta.resumeTitle'), description: t('COPY-meta.resumeDescription'), path: RESUME_PATH },
  now: { title: t('COPY-meta.nowTitle'), description: t('COPY-meta.nowDescription'), path: '/now/' },
  settings: {
    title: t('COPY-meta.settingsTitle'),
    description: t('COPY-meta.settingsDescription'),
    path: '/settings/',
    // Personal to each device and not in the site index (COPY-meta.settingsTitle), so kept out of search results.
    noindex: true,
  },
};

/**
 * SCR-NotFound: served at any unknown address, so it names no address and nothing about any tool (F-015.R4).
 */
const NOT_FOUND: PageMeta = {
  title: t('COPY-notFound.title'),
  description: t('COPY-notFound.body'),
  path: '/404/',
  noindex: true,
};

export function metaFor(route: MetaRoute, registry: MetaRegistry): PageMeta {
  switch (route.page) {
    case 'notFound':
      return { ...NOT_FOUND };
    case 'tool': {
      // F-015.R2; a hidden or unknown tool gets no page, and its address the not-found preview (F-015.R4, RULE-06).
      const tool = registry.toolById(route.id);
      if (!tool || tool.hidden) return { ...NOT_FOUND };
      return {
        title: t('COPY-meta.toolTitle', { tool: tool.name }),
        description: tool.summary,
        path: toolPath(route.id),
      };
    }
    case 'category': {
      // F-015.R5; `categories` holds only categories with visible tools (RULE-06).
      const category = registry.categories.find((c) => c.id === route.id);
      if (!category) return { ...NOT_FOUND };
      return {
        title: t('COPY-meta.categoryTitle', { category: category.name }),
        description: category.intro,
        path: categoryPath(category.id),
      };
    }
    default:
      return { ...STATIC[route.page] };
  }
}

/** One element of the head metadata, rendered by <HeadMeta>. */
export interface HeadTag {
  tag: 'meta' | 'link';
  attrs: Record<string, string>;
}

/**
 * The head tags of the open link-preview metadata standard (Open Graph, plus `twitter:card`; platform-mapping),
 * with absolute addresses on the portal origin. Throws when the title or description is too long (NFR-12), so
 * the build fails naming the page.
 */
export function headTags(meta: PageMeta, origin: string): HeadTag[] {
  const { title, description, path, noindex } = meta;
  if (title.length > MAX_TITLE)
    throw new Error(`NFR-12: ${path} title is ${title.length} characters (at most ${MAX_TITLE}): "${title}"`);
  if (description.length > MAX_DESCRIPTION)
    throw new Error(
      `NFR-12: ${path} description is ${description.length} characters (at most ${MAX_DESCRIPTION}): "${description}"`,
    );
  const m = (key: 'name' | 'property', name: string, content: string): HeadTag => ({
    tag: 'meta',
    attrs: { [key]: name, content },
  });
  // The not-found page answers at any address, so it names none; every other page names its own.
  const url = path === NOT_FOUND.path ? undefined : `${origin}${path}`;
  return [
    m('name', 'description', description),
    ...(noindex ? [m('name', 'robots', 'noindex')] : []),
    ...(url ? [{ tag: 'link' as const, attrs: { rel: 'canonical', href: url } }] : []),
    m('property', 'og:type', 'website'),
    m('property', 'og:site_name', t('COPY-shell.brand')),
    m('property', 'og:title', title),
    m('property', 'og:description', description),
    ...(url ? [m('property', 'og:url', url)] : []),
    m('property', 'og:image', `${origin}${PREVIEW_IMAGE.path}`),
    m('property', 'og:image:type', PREVIEW_IMAGE.type),
    m('property', 'og:image:width', String(PREVIEW_IMAGE.width)),
    m('property', 'og:image:height', String(PREVIEW_IMAGE.height)),
    m('name', 'twitter:card', 'summary_large_image'),
  ];
}
