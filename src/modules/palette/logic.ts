// MOD-Palette logic (CMP-CommandPalette), pure and browser-safe; the island (Palette.tsx) only renders it.
// - Entries: visible tools from the catalog data file, the pages (six, or seven with the Résumé,
//   F-017.R4) and the four actions; pages and actions carry their names in both languages, and every entry is
//   matched in both (RULE-05, F-019.R5); the island shows the version in the language showing.
// - Empty query (F-004.R2): Favorites (at most 8, pin order), Recents (RULE-01: at most 8, newest first,
//   favorites left out), Pages. Hidden or unknown tools never show (RULE-06, INV-04).
// - A query (F-004.R3): MOD-Search `searchPalette`, groups Tools, Pages, Actions, 8 each.
// - Running (F-004.R4, R5): everything closes the palette first (so focus handling and navigation never race),
//   except copy-address, which reports `copied` so the island shows the confirmation and then closes.
// - The shortcut (F-004.R1, platform-mapping): Meta+K on Apple platforms, Control+K elsewhere.
// - `paletteBootstrap`: the inline script (CSP-hashed by BaseLayout) that arms the shortcut and the search
//   controls before the island has loaded, opens the pre-rendered <dialog> with showModal() and focuses the field
//   (NFR-02), closes it on a click outside, and returns focus where it was on close (F-004.R1).
// Implements: F-004.R1 to F-004.R6 (logic), RULE-01 (palette list), RULE-05 (via MOD-Search), F-019.R2 (the
// switch-language action), F-019.R5.
import type { IndexedTool } from '../content/emit-catalog-data.ts';
import type { Lang, Loc } from '../language/languages.ts';
import { visibleFavorites, visibleRecents, type PersonalData } from '../personal-data/index.ts';
import { normalize, searchKeys, searchPalette, type PaletteGroupId, type SearchKeys } from '../search/index.ts';
import type { OpenableTool } from '../tool-host/index.ts';
import { PALETTE_HYDRATE_EVENT } from './events.ts';

/** F-004.R2: favorites shown on an empty query. Recents use RULE-01's 8 (MOD-PersonalData default). */
export const PALETTE_FAVORITES_MAX = 8;
/** How long the copied confirmation shows before the palette closes (F-004.R4, CMP-CommandPalette "copied"). */
export const COPIED_MS = 1200;

export const PALETTE_DIALOG_ID = 'tk-palette';
export const PALETTE_INPUT_ID = 'tk-palette-q';
/** The DOM event other islands dispatch on `document` to open the palette (MOD-Palette `openPalette`). */
export const OPEN_PALETTE_EVENT = 'tarokit:open-palette';
export { PALETTE_HYDRATE_EVENT };
/** The shortcut as shown in the search controls and the placeholder (COPY-palette.placeholder {shortcut}). */
export const SHORTCUT_LABELS = { apple: '⌘K', other: 'Ctrl K' } as const;

/** F-004.R5, in display order. */
export const ACTIONS = ['theme', 'language', 'export', 'copy'] as const;
export type ActionId = (typeof ACTIONS)[number];

/** F-004.R5: the switch-language action also matches these words, whatever language is showing. */
export const LANGUAGE_ACTION_KEYWORDS = ['language', 'ngôn ngữ', 'English', 'Vietnamese', 'Tiếng Việt'] as const;

type ToolData = Pick<IndexedTool, 'id' | 'name' | 'summary' | 'tags' | 'keys' | 'openMode' | 'url'>;

export interface PageItem {
  id: string;
  /** COPY-nav.*, in both languages. */
  name: Loc;
  path: string;
}

export type ToolEntry = ToolData & { kind: 'tool' };
export type PageEntry = PageItem & { kind: 'page'; keys: SearchKeys };
export interface ActionEntry {
  kind: 'action';
  id: ActionId;
  name: Loc;
  keys: SearchKeys;
}
export type PaletteEntry = ToolEntry | PageEntry | ActionEntry;

export interface PaletteEntries {
  tools: ToolEntry[];
  pages: PageEntry[];
  actions: ActionEntry[];
}

export type ViewGroupId = 'favorites' | 'recents' | PaletteGroupId;
export interface ViewGroup {
  id: ViewGroupId;
  items: PaletteEntry[];
}

/** Everything the palette offers; `data` is null when the catalog data file could not be loaded. */
export function paletteIndex(
  data: { tools: readonly ToolData[] } | null,
  pages: readonly PageItem[],
  actions: Readonly<Record<ActionId, Loc>>,
): PaletteEntries {
  return {
    tools: (data?.tools ?? []).map(({ id, name, summary, tags, keys, openMode, url }) => ({
      kind: 'tool',
      id,
      name,
      summary,
      tags,
      keys,
      openMode,
      url,
    })),
    pages: pages.map((p) => ({ ...p, kind: 'page', keys: searchKeys(p) })),
    actions: ACTIONS.map((id) => ({
      kind: 'action',
      id,
      name: actions[id],
      keys: searchKeys({ name: actions[id], tags: id === 'language' ? LANGUAGE_ACTION_KEYWORDS : [] }),
    })),
  };
}

/** F-004.R2: Favorites, Recents (RULE-01) and Pages, in that order; empty groups are left out. */
export function emptyQueryGroups(index: PaletteEntries, doc: Pick<PersonalData, 'favorites' | 'recents'>): ViewGroup[] {
  const byId = new Map(index.tools.map((t) => [t.id, t]));
  const visible = new Set(byId.keys());
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const groups: ViewGroup[] = [
    {
      id: 'favorites',
      items: pick(visibleFavorites(doc.favorites, visible).map((f) => f.toolId)).slice(0, PALETTE_FAVORITES_MAX),
    },
    { id: 'recents', items: pick(visibleRecents(doc, visible).map((r) => r.toolId)) },
    { id: 'pages', items: index.pages },
  ];
  return groups.filter((g) => g.items.length > 0);
}

/** The groups the palette shows for `query` (F-004.R2 when blank, F-004.R3 otherwise). */
export function paletteView(
  query: string,
  index: PaletteEntries,
  doc: Pick<PersonalData, 'favorites' | 'recents'>,
  lang: Lang = 'en-US',
): ViewGroup[] {
  if (!normalize(query)) return emptyQueryGroups(index, doc);
  return searchPalette(query, index, { favorites: doc.favorites.map((f) => f.toolId), lang });
}

export interface RunEnvironment {
  /** Closes the palette (focus returns where it was). */
  close(): void;
  /** MOD-ToolHost `openTool` (F-003: linked in a new tab with the visit recorded, embedded at /t/<id>/). */
  openTool(tool: OpenableTool): void;
  /** Goes to a portal address. */
  assign(path: string): void;
  /** MOD-Theme quick toggle (RULE-03). */
  toggleTheme(): void;
  /** MOD-Language: switch to the other language and store it (F-019.R2). */
  switchLanguage(): void;
  /** MOD-Backup `exportBackup` (F-013.R1), lazy-loaded; rejects when the module can't load or the export fails. */
  exportData(): Promise<void>;
  /** Writes text to the clipboard, within the user's gesture. */
  copy(text: string): Promise<void>;
  /** The current page's address. */
  href(): string;
}

/** `copied`: show COPY-palette.copied, then close; `exportFailed`: stay open and show COPY-palette.exportFailed. */
export type RunOutcome = 'closed' | 'copied' | 'exportFailed';

/** Runs one result (F-004.R4, R5). */
export async function runEntry(entry: PaletteEntry, env: RunEnvironment): Promise<RunOutcome> {
  if (entry.kind === 'action' && entry.id === 'copy') {
    try {
      await env.copy(env.href());
      return 'copied';
    } catch {
      // The browser refused the clipboard: no confirmation to show, so the palette just closes.
      env.close();
      return 'closed';
    }
  }
  if (entry.kind === 'action' && entry.id === 'export') {
    // The palette stays open until the backup is saved, so a failure can be shown where the user asked for it.
    try {
      await env.exportData();
    } catch {
      return 'exportFailed';
    }
    env.close();
    return 'closed';
  }
  env.close();
  if (entry.kind === 'tool') env.openTool(entry);
  else if (entry.kind === 'page') env.assign(entry.path);
  else if (entry.id === 'language') env.switchLanguage();
  else env.toggleTheme();
  return 'closed';
}

interface NavigatorLike {
  platform?: string;
  userAgentData?: { platform?: string };
}

// The two functions below are also inlined, as source, into the bootstrap: keep them self-contained, with
// explicit semicolons and no string containing runs of spaces (the source is whitespace-collapsed).

/** Apple platforms use Command for Mod (platform-mapping). */
export function isApplePlatform(nav: NavigatorLike): boolean {
  const p = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
  return /mac|iphone|ipad|ipod/i.test(p);
}

/** Mod+K: Meta on Apple platforms, Control elsewhere, with no other modifier. */
export function isPaletteShortcut(
  e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>,
  apple: boolean,
): boolean {
  return (
    (e.key === 'k' || e.key === 'K') &&
    (apple ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey) &&
    !e.altKey &&
    !e.shiftKey
  );
}

interface BootstrapConfig {
  dialog: string;
  input: string;
  event: string;
  hydrate: string;
  labels: { apple: string; other: string };
}

// Inlined as source. The field's placeholder names the platform's shortcut: it is rendered as the localized
// placeholder for other platforms (ADR-0012); on Apple platforms the versions in `data-placeholder-apple-<lang>`
// replace it, and the one for the language showing is set now. `back` is where focus returns when the dialog closes, however it closes (Esc, a click
// outside, Cancel, or running a result). Opening also asks the island to hydrate now (PALETTE_HYDRATE_EVENT,
// directive.ts) rather than at idle time. Until the island marks the field `data-live`, an Enter is kept as
// `data-pending-enter`, which the island runs once its data has loaded, so no early key is lost.
function paletteMain(
  c: BootstrapConfig,
  isApple: (n: NavigatorLike) => boolean,
  isShortcut: typeof isPaletteShortcut,
): void {
  const d = document;
  const dlg = d.getElementById(c.dialog) as HTMLDialogElement | null;
  const q = d.getElementById(c.input) as HTMLInputElement | null;
  if (!dlg || !q) return;
  const apple = isApple(navigator);
  let back: Element | null = null;
  d.querySelectorAll('[data-tk-shortcut]').forEach(function (e) {
    e.textContent = apple ? c.labels.apple : c.labels.other;
  });
  d.querySelectorAll('[data-tk-palette-open]').forEach(function (e) {
    e.setAttribute('aria-keyshortcuts', apple ? 'Meta+K' : 'Control+K');
  });
  if (apple)
    ['en-US', 'vi-VN'].forEach(function (l) {
      q.setAttribute('data-l-placeholder-' + l, q.getAttribute('data-placeholder-apple-' + l)!);
    });
  q.placeholder = q.getAttribute('data-l-placeholder-' + d.documentElement.lang)!;
  function open() {
    if (!dlg!.open) {
      back = d.activeElement;
      dlg!.showModal();
    }
    q!.focus();
    d.dispatchEvent(new Event(c.hydrate));
  }
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.isComposing && !q!.hasAttribute('data-live')) {
      e.preventDefault();
      q!.setAttribute('data-pending-enter', '');
    }
  });
  d.addEventListener('keydown', function (e) {
    if (isShortcut(e, apple)) {
      e.preventDefault();
      open();
    }
  });
  d.addEventListener('click', function (e) {
    const t = e.target as Element;
    if (t === dlg) dlg.close();
    else if (t.closest('[data-tk-palette-open]')) open();
    else if (t.closest('[data-tk-palette-close]')) dlg!.close();
  });
  d.addEventListener(c.event, open);
  dlg.addEventListener('close', function () {
    const b = back as HTMLElement | null;
    back = null;
    q!.value = '';
    q!.removeAttribute('data-pending-enter');
    if (b && b.isConnected && b.focus) b.focus();
  });
}

const config: BootstrapConfig = {
  dialog: PALETTE_DIALOG_ID,
  input: PALETTE_INPUT_ID,
  event: OPEN_PALETTE_EVENT,
  hydrate: PALETTE_HYDRATE_EVENT,
  labels: SHORTCUT_LABELS,
};

/** The palette bootstrap's source (MOD-Palette), inlined at the end of <body> and hashed for the CSP. */
export const paletteBootstrap =
  `(${paletteMain})(${JSON.stringify(config)},${isApplePlatform},${isPaletteShortcut})`.replace(/\s+/g, ' ');

/**
 * The polite result-count announcement (COPY-palette.resultCountOne / COPY-palette.resultCount) in `lang`, the
 * language showing (F-019.R4); empty for no results, which has its own status message (F-004.R6).
 */
export function resultCountText(n: number, count: { one: Loc; other: Loc }, lang: Lang): string {
  if (n <= 0) return '';
  return n === 1 ? count.one[lang] : count.other[lang].split('{count}').join(String(n));
}

/** Opens the palette from another island, such as home's search entry (F-007.R2). */
export function openPalette(doc: Pick<Document, 'dispatchEvent'> = document): void {
  doc.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

/**
 * The part of `name` that matches `query`, as [start, end) offsets into `name`, ignoring case and diacritics like
 * the search itself (RULE-05); undefined when the name does not contain the query. Used to mark the match.
 */
export function matchRange(name: string, query: string): [number, number] | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  let folded = '';
  const origin: number[] = [];
  let at = 0;
  for (const ch of name) {
    const part = /\s/.test(ch) ? (folded && !folded.endsWith(' ') ? ' ' : '') : normalize(ch);
    for (const c of part) {
      folded += c;
      origin.push(at);
    }
    at += ch.length;
  }
  const start = folded.indexOf(q);
  if (start < 0) return undefined;
  const end = start + q.length;
  return [origin[start]!, end < origin.length ? origin[end]! : name.length];
}
