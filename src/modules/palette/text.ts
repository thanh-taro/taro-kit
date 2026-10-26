// MOD-Palette build-time strings and icons for the island and the shell's search control (MOD-Copy, ADR-0003),
// so the island ships no copy catalog or icon set. Build-time only (the icon set is read from disk).
import { catalogDataFile, getRegistry, RESUME_PATH, type Registry } from '../content/index.ts';
import { t, tBoth, type CopyId } from '../copy/index.ts';
import { mapText, otherLanguage, type Loc } from '../language/languages.ts';
import { iconSvg } from '../design-system/icons.ts';
import { SHORTCUT_LABELS, type ActionId, type PageItem, type ViewGroupId } from './logic.ts';

export interface PaletteText {
  /** COPY-palette.placeholder with the shortcut for Apple platforms and for the others, in both languages. */
  placeholder: { apple: Loc; other: Loc };
  /** COPY-palette.dialogLabel, also the results list's name. */
  label: Loc;
  /** COPY-palette.group* */
  groups: Record<ViewGroupId, Loc>;
  /** The pages (COPY-nav.*), F-004.R2: six, or seven with the Résumé (F-017.R4). */
  pages: PageItem[];
  /** COPY-palette.action*; the language action names the other language (COPY-palette.actionLanguage). */
  actions: Record<ActionId, Loc>;
  /** COPY-language.en and COPY-language.vi, each in its own language: marked in the language action's name. */
  languageNames: Loc;
  /** COPY-palette.hints */
  hints: Loc;
  /** COPY-palette.noResults with a literal "{query}" left in. */
  noResults: Loc;
  /** COPY-palette.browseAll */
  browseAll: Loc;
  /** COPY-palette.copied */
  copied: Loc;
  /** COPY-palette.exportFailed */
  exportFailed: Loc;
  /** COPY-palette.close */
  close: Loc;
  /** COPY-palette.resultCountOne, and COPY-palette.resultCount with a literal "{count}" left in. */
  count: { one: Loc; other: Loc };
  /** COPY-palette.unavailable */
  unavailable: Loc;
  /** COPY-tool.opensNewTab, for linked tools (F-003.R4). */
  opensNewTab: Loc;
  /** Inline SVG markup: the field's search icon, the no-results icon, the copied check and the new-tab marker. */
  icons: { search: string; noResults: string; copied: string; newTab: string; language: string };
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
  PAGES.filter(([id]) => resume || id !== 'resume').map(([id, path, copy]) => ({ id, path, name: tBoth(copy) }));

const texts = new WeakMap<Pick<Registry, 'resume'>, PaletteText>();

/** Built once per registry: every page passes the same props. */
export function paletteText(registry: Pick<Registry, 'resume'> = getRegistry()): PaletteText {
  let text = texts.get(registry);
  if (!text) texts.set(registry, (text = buildText(!!registry.resume)));
  return text;
}

const languageNames: Loc = {
  'en-US': t('COPY-language.en', undefined, 'en-US'),
  'vi-VN': t('COPY-language.vi', undefined, 'vi-VN'),
};

function buildText(resume: boolean): PaletteText {
  return {
    placeholder: {
      apple: tBoth('COPY-palette.placeholder', { shortcut: SHORTCUT_LABELS.apple }),
      other: tBoth('COPY-palette.placeholder', { shortcut: SHORTCUT_LABELS.other }),
    },
    label: tBoth('COPY-palette.dialogLabel'),
    groups: {
      favorites: tBoth('COPY-palette.groupFavorites'),
      recents: tBoth('COPY-palette.groupRecents'),
      tools: tBoth('COPY-palette.groupTools'),
      pages: tBoth('COPY-palette.groupPages'),
      actions: tBoth('COPY-palette.groupActions'),
    },
    pages: palettePages(resume),
    actions: {
      theme: tBoth('COPY-palette.actionTheme'),
      // F-004.R5: the switch goes to the other language, so each version names the other one.
      language: tBoth('COPY-palette.actionLanguage', (lang) => ({ language: languageNames[otherLanguage(lang)] })),
      export: tBoth('COPY-palette.actionExport'),
      copy: tBoth('COPY-palette.actionCopy'),
    },
    languageNames,
    hints: tBoth('COPY-palette.hints'),
    noResults: tBoth('COPY-palette.noResults', { query: '{query}' }),
    browseAll: tBoth('COPY-palette.browseAll'),
    copied: tBoth('COPY-palette.copied'),
    exportFailed: tBoth('COPY-palette.exportFailed'),
    close: tBoth('COPY-palette.close'),
    count: {
      one: tBoth('COPY-palette.resultCountOne'),
      other: tBoth('COPY-palette.resultCount', { count: '{count}' }),
    },
    unavailable: tBoth('COPY-palette.unavailable'),
    opensNewTab: tBoth('COPY-tool.opensNewTab'),
    icons: {
      search: iconSvg('search'),
      noResults: iconSvg('search-x'),
      copied: iconSvg('check', 16),
      newTab: iconSvg('arrow-up-right', 16),
      language: iconSvg('globe', 16),
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
export function searchControlLead(): Loc {
  const marker = '\u0000';
  return mapText(tBoth('COPY-palette.placeholder', { shortcut: marker }), (v) => v.split(`(${marker})`)[0]!.trim());
}
