// MOD-Meta: each page's link-preview metadata (specs/40-technical/modules/MOD-Meta.md). Pure: no Node imports.
// Implements: F-015.R1, F-015.R2, F-015.R4, F-015.R5, F-017.R6, F-018.R4, NFR-12, F-019.R8 (previews in English;
// only the browser's page title follows the language showing, F-019.R4).
import { categoryPath, toolPath } from '../content/derive.ts';
import { PRIVACY_PATH, TERMS_PATH } from '../content/policy.ts';
import { RESUME_PATH } from '../content/resume.ts';
import { t, tBoth } from '../copy/index.ts';
import { pick, type Loc, type Text } from '../language/languages.ts';

/** The pages that declare previews (routes per MOD-Pages). */
export type MetaRoute =
  | { page: 'home' | 'tools' | 'about' | 'resume' | 'now' | 'settings' | 'privacy' | 'terms' | 'notFound' }
  | { page: 'category'; id: string }
  | { page: 'tool'; id: string };

/** What a page declares; spread into `<BaseLayout>` (MOD-Shell). */
export interface PageMeta {
  /** The English title: link previews are in English whatever language shows (F-019.R8, RULE-16). */
  title: string;
  description: string;
  /** The page title in both languages, for the browser's title bar (F-019.R4); its en-US is `title`. */
  titles: Loc;
  /** The page's portal path, e.g. "/about/". */
  path: string;
  /** Kept out of search results (the not-found page, F-015.R4). */
  noindex?: boolean;
}

/** The registry views metaFor reads: visible tools by id, and visible categories (RULE-06). */
export interface MetaRegistry {
  toolById(id: string): { name: string; summary: Text; hidden: boolean } | undefined;
  categories: readonly { id: string; name: Text; intro: Text }[];
}

/** The shared portal preview image (NFR-12, F-015 scope: one image in M-1). */
export const PREVIEW_IMAGE = { path: '/preview.png', width: 1200, height: 630, type: 'image/png' } as const;

/** NFR-12 limits. */
export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 160;

const EN = 'en-US';
type MetaCopy = Parameters<typeof tBoth>[0];
/** A page's meta from its COPY title and description: previews in English, the title also in Vietnamese. */
const page = (title: MetaCopy, description: MetaCopy, path: string): PageMeta => {
  const titles = tBoth(title);
  return { title: titles[EN], description: t(description, undefined, EN), titles, path };
};

const STATIC: Record<Exclude<MetaRoute['page'], 'category' | 'tool' | 'notFound'>, PageMeta> = {
  home: page('COPY-meta.homeTitle', 'COPY-meta.homeDescription', '/'),
  tools: page('COPY-meta.toolsTitle', 'COPY-meta.toolsDescription', '/tools/'),
  about: page('COPY-meta.aboutTitle', 'COPY-meta.aboutDescription', '/about/'),
  // F-017.R6: the Résumé page exists only when there is a résumé (MOD-Pages), so only then is this declared.
  resume: page('COPY-meta.resumeTitle', 'COPY-meta.resumeDescription', RESUME_PATH),
  now: page('COPY-meta.nowTitle', 'COPY-meta.nowDescription', '/now/'),
  // F-018.R4: the Privacy and Terms pages.
  privacy: page('COPY-meta.privacyTitle', 'COPY-meta.privacyDescription', PRIVACY_PATH),
  terms: page('COPY-meta.termsTitle', 'COPY-meta.termsDescription', TERMS_PATH),
  settings: {
    ...page('COPY-meta.settingsTitle', 'COPY-meta.settingsDescription', '/settings/'),
    // Personal to each device and not in the site index (COPY-meta.settingsTitle), so kept out of search results.
    noindex: true,
  },
};

/**
 * SCR-NotFound: served at any unknown address, so it names no address and nothing about any tool (F-015.R4).
 */
const NOT_FOUND: PageMeta = { ...page('COPY-notFound.title', 'COPY-notFound.body', '/404/'), noindex: true };

export function metaFor(route: MetaRoute, registry: MetaRegistry): PageMeta {
  switch (route.page) {
    case 'notFound':
      return { ...NOT_FOUND };
    case 'tool': {
      // F-015.R2; a hidden or unknown tool gets no page, and its address the not-found preview (F-015.R4, RULE-06).
      const tool = registry.toolById(route.id);
      if (!tool || tool.hidden) return { ...NOT_FOUND };
      const titles = tBoth('COPY-meta.toolTitle', { tool: tool.name });
      return { title: titles[EN], titles, description: pick(tool.summary, EN), path: toolPath(route.id) };
    }
    case 'category': {
      // F-015.R5; `categories` holds only categories with visible tools (RULE-06).
      const category = registry.categories.find((c) => c.id === route.id);
      if (!category) return { ...NOT_FOUND };
      const titles = tBoth('COPY-meta.categoryTitle', (lang) => ({ category: pick(category.name, lang) }));
      return { title: titles[EN], titles, description: pick(category.intro, EN), path: categoryPath(category.id) };
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
    m('property', 'og:site_name', t('COPY-shell.brand', undefined, EN)),
    m('property', 'og:locale', 'en_US'),
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
