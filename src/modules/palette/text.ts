// MOD-Palette build-time strings and icons for the island and the shell's search control (MOD-Copy, ADR-0003),
// so the island ships no copy catalog or icon set. Build-time only (the icon set is read from disk).
import { catalogDataFile, getRegistry, RESUME_PATH, type Registry } from '../content/index.ts';
import { t, type CopyId } from '../copy/index.ts';
import { iconSvg } from '../design-system/icons.ts';
import { SHORTCUT_LABELS, type ActionId, type PageItem, type ViewGroupId } from './logic.ts';

export interface PaletteText {
  /** COPY-palette.placeholder with the shortcut for Apple platforms and for the others. */
  placeholder: { apple: string; other: string };
  /** COPY-palette.dialogLabel, also the results list's name. */
  label: string;
  /** COPY-palette.group* */
  groups: Record<ViewGroupId, string>;
  /** The pages (COPY-nav.*), F-004.R2: six, or seven with the Résumé (F-017.R4). */
  pages: PageItem[];
  /** COPY-palette.action* */
  actions: Record<ActionId, string>;
  /** COPY-palette.hints */
  hints: string;
  /** COPY-palette.noResults with a literal "{query}" left in. */
  noResults: string;
  /** COPY-palette.browseAll */
  browseAll: string;
  /** COPY-palette.copied */
  copied: string;
  /** COPY-palette.exportFailed */
  exportFailed: string;
  /** COPY-palette.close */
  close: string;
  /** COPY-palette.resultCountOne, and COPY-palette.resultCount with a literal "{count}" left in. */
  count: { one: string; other: string };
  /** COPY-palette.unavailable */
  unavailable: string;
  /** COPY-tool.opensNewTab, for linked tools (F-003.R4). */
  opensNewTab: string;
  /** Inline SVG markup: the field's search icon, the no-results icon, the copied check and the new-tab marker. */
  icons: { search: string; noResults: string; copied: string; newTab: string };
}

type NavCopy = Extract<CopyId, `COPY-nav.${string}`>;
const PAGES: [id: string, path: string, copy: NavCopy][] = [
  ['home', '/', 'COPY-nav.home'],
  ['tools', '/tools/', 'COPY-nav.tools'],
  ['about', '/about/', 'COPY-nav.about'],
  ['resume', RESUME_PATH, 'COPY-nav.resume'],
  ['now', '/now/', 'COPY-nav.now'],
  ['settings', '/settings/', 'COPY-nav.settings'],
];

/** F-004.R2 Pages: Home, Tools, About, Résumé (only when there is a résumé, F-017.R4), Now and Settings. */
export const palettePages = (resume: boolean): PageItem[] =>
  PAGES.filter(([id]) => resume || id !== 'resume').map(([id, path, copy]) => ({ id, path, name: t(copy) }));

const texts = new WeakMap<Pick<Registry, 'resume'>, PaletteText>();

/** Built once per registry: every page passes the same props. */
export function paletteText(registry: Pick<Registry, 'resume'> = getRegistry()): PaletteText {
  let text = texts.get(registry);
  if (!text) texts.set(registry, (text = buildText(!!registry.resume)));
  return text;
}

function buildText(resume: boolean): PaletteText {
  return {
    placeholder: {
      apple: t('COPY-palette.placeholder', { shortcut: SHORTCUT_LABELS.apple }),
      other: t('COPY-palette.placeholder', { shortcut: SHORTCUT_LABELS.other }),
    },
    label: t('COPY-palette.dialogLabel'),
    groups: {
      favorites: t('COPY-palette.groupFavorites'),
      recents: t('COPY-palette.groupRecents'),
      tools: t('COPY-palette.groupTools'),
      pages: t('COPY-palette.groupPages'),
      actions: t('COPY-palette.groupActions'),
    },
    pages: palettePages(resume),
    actions: {
      theme: t('COPY-palette.actionTheme'),
      export: t('COPY-palette.actionExport'),
      copy: t('COPY-palette.actionCopy'),
    },
    hints: t('COPY-palette.hints'),
    noResults: t('COPY-palette.noResults', { query: '{query}' }),
    browseAll: t('COPY-palette.browseAll'),
    copied: t('COPY-palette.copied'),
    exportFailed: t('COPY-palette.exportFailed'),
    close: t('COPY-palette.close'),
    count: { one: t('COPY-palette.resultCountOne'), other: t('COPY-palette.resultCount', { count: '{count}' }) },
    unavailable: t('COPY-palette.unavailable'),
    opensNewTab: t('COPY-tool.opensNewTab'),
    icons: {
      search: iconSvg('search'),
      noResults: iconSvg('search-x'),
      copied: iconSvg('check', 16),
      newTab: iconSvg('arrow-up-right', 16),
    },
  };
}

// The catalog data file's address, hashed once per registry rather than once per page.
const dataPaths = new WeakMap<Registry, string>();

/** The address of this build's catalog data file (MOD-Content `catalogDataFile`). */
export function paletteDataPath(registry: Registry = getRegistry()): string {
  let path = dataPaths.get(registry);
  if (!path) dataPaths.set(registry, (path = catalogDataFile(registry).path));
  return path;
}

/**
 * The shell's search control text (CMP-AppShell): COPY-palette.placeholder up to its "({shortcut})", since the
 * control shows the shortcut as a separate key cap (design CMP-AppShell full variant).
 */
export function searchControlLead(): string {
  const marker = '\u0000';
  return t('COPY-palette.placeholder', { shortcut: marker }).split(`(${marker})`)[0]!.trim();
}
