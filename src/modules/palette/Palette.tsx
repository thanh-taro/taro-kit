// MOD-Palette island: the inside of the command palette's <dialog> (CMP-CommandPalette), hydrated at idle time
// or at once when the palette opens (`client:palette`, directive.ts; ADR-0002). The <dialog> itself is static (PaletteDialog.astro) and the inline bootstrap opens and closes it, so
// the shortcut works before this island has loaded; the field is uncontrolled, so text typed before hydration
// is kept. Design: design/canvas/CMP-CommandPalette, PaletteDesktop, PaletteMobile.
// - Data: the hashed catalog data file (visible entries only, with pre-normalized keys), fetched on hydration,
//   which is idle time; BaseLayout preloads it with the page, so the fetch usually reuses that download. If it
//   can't load, pages and actions still work and the palette says so (COPY-palette.unavailable, F-004 edge case).
// - Glyph warm-up (NFR-02, QA perf): some action glyphs (⤓, ⧉) are in no bundled font, and the browser's first
//   search for a system font that has them took ~60 ms (4x CPU) inside the first keystroke that showed them. At
//   hydration, outside the closed dialog, every glyph is laid out once, hidden, so that search is done at idle.
// - Empty query: Favorites, Recents, Pages (F-004.R2); a query: Tools, Pages, Actions (F-004.R3).
// - Keyboard (F-004.R4, ARIA combobox + listbox): focus stays in the field; Up and Down move the highlighted
//   option across groups (aria-activedescendant), Enter runs it, Esc closes (native dialog cancel). The first
//   option is highlighted whenever the results change.
// - The result count is announced politely after each query (COPY-palette.resultCount); no results shows
//   CMP-StateMessage with the browse-catalog link (F-004.R6), announced as a status.
// - Copy-address shows COPY-palette.copied, then closes (F-004.R4, R5).
// - Languages (F-019.R4, R5): text that is in the page before hydration (the field's label and placeholder, Cancel,
//   the hints) is in both languages (<L>, localized attributes); results, counts and messages are made at run time
//   in the language showing (`useShownLanguage`). The language action's name marks the other language's name with
//   its own language (CMP-CommandPalette).
// Implements: F-004.R2 to F-004.R6 (with logic.ts), RULE-01 and RULE-05 on screen, F-019.R2 (the action).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogDataFileContent } from '../content/emit-catalog-data.ts';
import StateMessage from '../design-system/StateMessage.tsx';
import { monogram } from '../design-system/tool-card.ts';
import { language } from '../language/index.ts';
import { localizedAttrs, mergeAttrs } from '../language/attrs.ts';
import { L } from '../language/L.tsx';
import { otherLanguage, pick, type Lang, type Loc, type Text } from '../language/languages.ts';
import { useShownLanguage } from '../language/use.ts';
import { personalData, type PersonalData } from '../personal-data/index.ts';
import { theme } from '../theme/index.ts';
import { openTool } from '../tool-host/open-tool.ts';
import {
  COPIED_MS,
  isApplePlatform,
  matchRange,
  PALETTE_INPUT_ID,
  paletteIndex,
  paletteView,
  resultCountText,
  runEntry,
  type PaletteEntry,
  type RunEnvironment,
  type ViewGroup,
  type ViewGroupId,
} from './logic.ts';
import type { PaletteText } from './text.ts';

export interface PaletteProps {
  text: PaletteText;
  /** The catalog data file's address (MOD-Content `catalogDataFile`). */
  dataUrl: string;
  /** Where "Browse all my tools" goes (SCR-Catalog). */
  catalogPath: string;
}

type Data = Pick<CatalogDataFileContent, 'tools'>;
type Loaded = Data | 'failed' | null;

const LIST_ID = 'tk-palette-list';
const GLYPHS: Record<string, string> = {
  // Pages and actions (design: CMP-CommandPalette, PaletteDesktop); text presentation, never emoji.
  home: '⌂',
  tools: '▦',
  about: '☺︎',
  now: '✦',
  settings: '⚙︎',
  theme: '◐',
  export: '⤓',
  copy: '⧉',
};
/** Lays out every glyph once, hidden and outside the (closed, so unrendered) dialog, then removes it. */
function warmGlyphs() {
  const warm = document.createElement('span');
  warm.className = 'tk-palette__glyph tk-visually-hidden';
  warm.setAttribute('aria-hidden', 'true');
  warm.textContent = Object.values(GLYPHS).join('');
  document.body.append(warm);
  void warm.offsetWidth; // forces the layout that resolves each glyph's font
  warm.remove();
}
const fill = (template: string, name: string, value: string | number) =>
  template.split(`{${name}}`).join(String(value));
const flatten = (groups: ViewGroup[]) => groups.flatMap((g) => g.items.map((entry) => ({ group: g.id, entry })));
const optionId = (group: ViewGroupId, entry: PaletteEntry) => `tk-palette-${group}-${entry.kind}-${entry.id}`;

/** A run of a name, marked with its own language when it differs from the language showing. */
interface Run {
  text: string;
  lang?: Lang;
}

/** The name with the query's match marked; runs in another language keep their `lang` (F-019.R4). */
function Name({ runs, query }: { runs: Run[]; query: string }) {
  const whole = runs.map((r) => r.text).join('');
  const range = query ? matchRange(whole, query) : undefined;
  let at = 0;
  return (
    <>
      {runs.map((run, i) => {
        const start = at;
        at += run.text.length;
        const [from, to] = range
          ? [Math.max(range[0] - start, 0), Math.min(range[1] - start, run.text.length)]
          : [0, 0];
        const body =
          from < to ? (
            <>
              {run.text.slice(0, from)}
              <mark>{run.text.slice(from, to)}</mark>
              {run.text.slice(to)}
            </>
          ) : (
            run.text
          );
        return run.lang ? (
          <span key={i} lang={run.lang}>
            {body}
          </span>
        ) : (
          <span key={i}>{body}</span>
        );
      })}
    </>
  );
}

/** The runs of an entry's name in `lang`: the language action marks the other language's name (COPY-language.*). */
function nameRuns(entry: PaletteEntry, lang: Lang, names: Loc): Run[] {
  const name = pick(entry.name, lang);
  if (entry.kind !== 'action' || entry.id !== 'language') return [{ text: name }];
  const other = otherLanguage(lang);
  const at = name.indexOf(names[other]);
  if (at < 0) return [{ text: name }];
  return [
    { text: name.slice(0, at) },
    { text: names[other], lang: other },
    { text: name.slice(at + names[other].length) },
  ].filter((r) => r.text);
}

export default function Palette({ text, dataUrl, catalogPath }: PaletteProps) {
  const field = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Loaded>(null);
  const [doc, setDoc] = useState<PersonalData | null>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  // An Enter pressed before the island or its data was ready: run once settled (no early key is lost).
  const [pending, setPending] = useState(false);
  const [apple, setApple] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const lang = useShownLanguage();
  // The announcement follows queries, not language switches (F-019 UX notes: switching announces nothing).
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    setApple(isApplePlatform(navigator));
    // Text typed before hydration is kept (the field is plain HTML until then).
    setQuery(field.current?.value ?? '');
    // From now on the island handles Enter; one the bootstrap kept before hydration is taken over.
    field.current?.setAttribute('data-live', '');
    if (field.current?.hasAttribute('data-pending-enter')) {
      field.current.removeAttribute('data-pending-enter');
      setPending(true);
    }
    const stop = personalData().data.subscribe(setDoc);
    let live = true;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    idle(() => live && warmGlyphs());
    fetch(dataUrl)
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : Promise.reject(new Error(`${r.status}`))))
      .then((d) => live && setData(d))
      .catch(() => live && setData('failed'));
    // However the dialog closes (Esc, a click outside, Cancel, a run), the next open starts from an empty query;
    // the bootstrap empties the field and returns focus.
    const dialog = field.current?.closest('dialog');
    const reset = () => {
      clearTimeout(closeTimer.current);
      setQuery('');
      setActive(0);
      setCopied(false);
      setExportFailed(false);
      setPending(false);
      setAnnouncement('');
    };
    dialog?.addEventListener('close', reset);
    return () => {
      live = false;
      stop();
      dialog?.removeEventListener('close', reset);
      clearTimeout(closeTimer.current);
    };
  }, [dataUrl]);

  const settled = data !== null && doc !== null;
  const failed = data === 'failed';
  const index = useMemo(
    () => paletteIndex(data && data !== 'failed' ? data : null, text.pages, text.actions),
    [data, text],
  );
  const searching = query.trim() !== '';
  const groups = useMemo(
    () => (settled ? paletteView(query, index, doc, lang) : []),
    [settled, query, index, doc, lang],
  );
  const flat = useMemo(() => flatten(groups), [groups]);
  const current = flat[Math.min(active, flat.length - 1)];
  const activeId = current ? optionId(current.group, current.entry) : undefined;

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId]);
  useEffect(() => {
    if (!settled) return;
    const n = flat.length;
    // No results is announced by its own status message.
    const l = langRef.current;
    setAnnouncement(searching ? resultCountText(n, text.count, l) : '');
  }, [settled, searching, flat, text]);

  const dialog = () => field.current?.closest('dialog');
  const env: RunEnvironment = {
    close: () => dialog()?.close(),
    openTool: (tool) => openTool(tool),
    assign: (path) => location.assign(new URL(path, location.href).href),
    toggleTheme: () => theme().toggle(),
    switchLanguage: () => language().switchLanguage(),
    exportData: () => import('../backup/index.ts').then((m) => m.exportBackup()),
    copy: (value) => navigator.clipboard.writeText(value),
    href: () => location.href,
  };
  const run = async (entry: PaletteEntry) => {
    setExportFailed(false);
    const outcome = await runEntry(entry, env);
    if (outcome === 'copied') {
      setCopied(true);
      closeTimer.current = setTimeout(() => dialog()?.close(), COPIED_MS);
    } else if (outcome === 'exportFailed') setExportFailed(true);
  };

  useEffect(() => {
    if (!settled || !pending) return;
    setPending(false);
    const chosen = flat[Math.min(active, flat.length - 1)];
    if (chosen) void run(chosen.entry);
  }, [settled, pending, flat]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && !settled) {
      e.preventDefault();
      setPending(true);
      return;
    }
    if (!settled || !doc) return;
    // A key pressed right after typing can arrive before the re-render: work from the field's text as it is now,
    // so Enter never runs a result of the previous query.
    const value = field.current?.value ?? query;
    const fresh = value === query;
    const list = fresh ? flat : flatten(paletteView(value, index, doc, lang));
    if (list.length === 0) return;
    const at = fresh ? Math.min(active, list.length - 1) : 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!fresh) setQuery(value);
      setActive(e.key === 'ArrowDown' ? Math.min(at + 1, list.length - 1) : Math.max(at - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void run(list[at]!.entry);
    }
  };

  const placeholder = apple ? text.placeholder.apple : text.placeholder.other;
  const noResults = settled && searching && flat.length === 0;
  let row = -1;
  return (
    <div class="tk-palette" data-ready={settled ? '' : undefined} data-failed={failed ? '' : undefined}>
      <div class="tk-palette__bar">
        <span
          class="tk-palette__search-icon"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: text.icons.search }}
        />
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- its text is <L>, one version per language */}
        <label for={PALETTE_INPUT_ID} class="tk-visually-hidden">
          <L text={placeholder} />
        </label>
        <input
          ref={field}
          id={PALETTE_INPUT_ID}
          class="tk-palette__field"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={flat.length > 0 ? 'true' : 'false'}
          aria-controls={flat.length > 0 ? LIST_ID : undefined}
          aria-activedescendant={activeId}
          autocomplete="off"
          autocapitalize="off"
          spellcheck={false}
          enterkeyhint="go"
          {...mergeAttrs(localizedAttrs('placeholder', placeholder, lang))}
          data-placeholder-apple-en-US={text.placeholder.apple['en-US']}
          data-placeholder-apple-vi-VN={text.placeholder.apple['vi-VN']}
          onInput={(e) => {
            // The first result is highlighted whenever the query changes (CMP-CommandPalette "results"); set in the
            // same update, so a key pressed right after typing never lands on a stale highlight.
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <kbd class="tk-palette__esc" aria-hidden="true">
          Esc
        </kbd>
        <button type="button" class="tk-palette__cancel" data-tk-palette-close>
          <L text={text.close} />
        </button>
      </div>
      {failed && (
        <p class="tk-palette__unavailable" role="status">
          {pick(text.unavailable, lang)}
        </p>
      )}
      {flat.length > 0 && (
        // Combobox pattern: focus stays in the field and options are reached through aria-activedescendant, so the
        // listbox and options are not focusable and their keyboard handling is the field's (onKeyDown above).
        // Pointer presses keep the focus in the field, so the keyboard model never breaks.
        // eslint-disable-next-line jsx-a11y/interactive-supports-focus
        <div
          id={LIST_ID}
          class="tk-palette__list"
          role="listbox"
          aria-label={pick(text.label, lang)}
          onMouseDown={(e) => e.preventDefault()}
        >
          {groups.map((g) => (
            <div key={g.id} class="tk-palette__group" role="group" aria-labelledby={`tk-palette-h-${g.id}`}>
              <div id={`tk-palette-h-${g.id}`} class="tk-palette__heading" role="presentation">
                {pick(text.groups[g.id], lang)}
              </div>
              {g.items.map((entry) => {
                row += 1;
                const i = row;
                const id = optionId(g.id, entry);
                const selected = id === activeId;
                const linked = entry.kind === 'tool' && entry.openMode === 'linked';
                const sub = entry.kind === 'tool' ? pick(entry.summary as Text, lang) : '';
                const glyph = entry.kind === 'tool' ? monogram(entry.name) : (GLYPHS[entry.id] ?? '');
                return (
                  // Reached from the field (aria-activedescendant); the click handler is the pointer path only.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={id}
                    id={id}
                    class="tk-palette__option"
                    role="option"
                    aria-selected={selected ? 'true' : 'false'}
                    data-kind={entry.kind}
                    onMouseMove={() => i !== active && setActive(i)}
                    onClick={() => void run(entry)}
                  >
                    {entry.kind === 'action' && entry.id === 'language' ? (
                      // The globe from the icon set (design PaletteDesktop language), build-time SVG.
                      <span
                        class="tk-palette__glyph tk-palette__glyph--icon"
                        aria-hidden="true"
                        dangerouslySetInnerHTML={{ __html: text.icons.language }}
                      />
                    ) : (
                      <span class="tk-palette__glyph" aria-hidden="true">
                        {glyph}
                      </span>
                    )}
                    <span class="tk-palette__text">
                      <span class="tk-palette__name">
                        <Name runs={nameRuns(entry, lang, text.languageNames)} query={searching ? query : ''} />
                        {linked && (
                          <>
                            <span
                              class="tk-palette__newtab"
                              aria-hidden="true"
                              dangerouslySetInnerHTML={{ __html: text.icons.newTab }}
                            />
                            <span class="tk-visually-hidden">, {pick(text.opensNewTab, lang)}</span>
                          </>
                        )}
                      </span>
                      {sub && <span class="tk-palette__sub">{sub}</span>}
                    </span>
                    <span class="tk-palette__hint" aria-hidden="true">
                      {selected && <kbd>↵</kbd>}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {noResults && (
        <div class="tk-palette__empty">
          <StateMessage
            variant="no-results"
            title={fill(text.noResults[lang], 'query', query.trim())}
            iconSvg={text.icons.noResults}
            action={{ href: catalogPath, label: text.browseAll[lang] }}
            live
          />
        </div>
      )}
      <p class="tk-visually-hidden" aria-live="polite" data-testid="palette-count">
        {announcement}
      </p>
      <p class="tk-palette__hints">
        {(['en-US', 'vi-VN'] as const).map((l) => (
          <span key={l} lang={l} data-l="" class="tk-palette__hints-lang">
            {text.hints[l].split(' · ').map((part) => (
              <span key={part}>{part}</span>
            ))}
          </span>
        ))}
      </p>
      <div class="tk-palette__toast" role="status">
        {exportFailed && <span class="tk-palette__failed">{pick(text.exportFailed, lang)}</span>}
        {copied && (
          <span class="tk-palette__copied">
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: text.icons.copied }} />
            {pick(text.copied, lang)}
          </span>
        )}
      </div>
    </div>
  );
}
