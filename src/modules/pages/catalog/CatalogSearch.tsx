// MOD-Pages island: SCR-Catalog search (F-002.R4, R5) over the static grouped list (F-002.R1 to R3).
// Design: design/canvas/CatalogDesktop, CatalogMobile, CatalogStatesDesktop.
// - Regions 2 to 4: the title and search field, the category navigation (the `nav` slot, static) and the grouped
//   list (the children, static, with their own favorite toggle islands). The island only adds behavior.
// - On hydration it fetches the hashed catalog data file (MOD-Content, ADR-0002: visible entries only, with
//   pre-normalized keys) and keeps any text typed before hydration.
// - While a query is entered, the grouped list is hidden (kept mounted, so its toggles stay hydrated) and one
//   list ranked by RULE-05 (MOD-Search `filterCatalog`) shows across all categories, each card with its
//   category label. It updates on every keystroke (NFR-02); favorites break ties as they stand at that keystroke,
//   so pinning a result never moves it under the pointer.
// - No match: CMP-StateMessage (page variant) with COPY-catalog.noResults and the clear action
//   (COPY-catalog.clear), which empties the field and returns focus to it.
// - The result count (COPY-category.toolCount / toolCountOne) is announced politely after each filtering, and
//   is empty at load (SCR-Catalog accessibility).
// Strings, icons and card text arrive as build-time props, so the island ships no copy catalog.
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import type { CatalogDataFileContent, IndexedTool } from '../../content/emit-catalog-data.ts';
import ToolCard, { type ToolCardText } from '../../design-system/ToolCard.tsx';
import { needsInternet } from '../../design-system/tool-card.ts';
import { online } from '../../offline/index.ts';
import StateMessage from '../../design-system/StateMessage.tsx';
import { personalData } from '../../personal-data/index.ts';
import { filterCatalog, normalize } from '../../search/index.ts';

/** Build-time strings and icons (see `catalogSearchText()` in catalog-text.ts). */
export interface CatalogSearchText {
  /** COPY-catalog.title */
  title: string;
  /** COPY-catalog.searchPlaceholder: the field's label and placeholder. */
  placeholder: string;
  /** COPY-catalog.noResults with a literal "{query}" left in. */
  noResults: string;
  /** COPY-catalog.clear */
  clear: string;
  /** COPY-catalog.searchUnavailable: why the field is disabled when the catalog data can't load. */
  unavailable: string;
  /** COPY-category.toolCountOne, and COPY-category.toolCount with a literal "{count}" left in. */
  count: { one: string; other: string };
  card: ToolCardText;
  icons: { search: string; noResults: string };
}

export interface CatalogSearchProps {
  text: CatalogSearchText;
  /** The catalog data file's address; left out when there are no visible tools: then there is no search field. */
  dataUrl?: string;
  /** The category navigation (static, an Astro slot). */
  nav?: ComponentChildren;
  /** The grouped list or the empty state (static, an Astro slot). */
  children?: ComponentChildren;
}

type Data = Pick<CatalogDataFileContent, 'categories' | 'tools'>;
const NO_DATA: Data = { categories: [], tools: [] };

export const fill = (template: string, name: string, value: string | number) =>
  template.split(`{${name}}`).join(String(value));

export default function CatalogSearch({ text, dataUrl, nav, children }: CatalogSearchProps) {
  const uid = useId();
  const fieldId = `${uid}-q`;
  const titleId = `${uid}-title`;
  const field = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [failed, setFailed] = useState(false);
  const reasonId = `${uid}-unavailable`;

  useEffect(() => {
    // Text typed before hydration is kept (the field is plain HTML until then).
    setQuery(field.current?.value ?? '');
    if (!dataUrl) return;
    let live = true;
    fetch(dataUrl)
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : Promise.reject(new Error(`${r.status}`))))
      .then((d) => live && setData(d))
      // Without the data the grouped list stays and the field is disabled with the reason, so search never
      // silently does nothing (F-002 edge case, COPY-catalog.searchUnavailable).
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [dataUrl]);

  const searching = data !== null && normalize(query) !== '';
  const results = useMemo<IndexedTool[]>(() => {
    if (!searching || !data) return [];
    const favorites = personalData()
      .favorites.peek()
      .map((f) => f.toolId);
    return filterCatalog(query, data.tools, { favorites });
  }, [searching, data, query]);
  const categoryName = useMemo(() => new Map((data ?? NO_DATA).categories.map((c) => [c.id, c.name])), [data]);

  const countText = (n: number) => (n === 1 ? text.count.one : fill(text.count.other, 'count', n));
  useEffect(() => {
    if (!data) return;
    // Announced after filtering only: nothing at load, the total again once the query is cleared.
    setAnnouncement((prev) => (searching ? countText(results.length) : prev ? countText(data.tools.length) : prev));
  }, [searching, results, data]);

  const clear = () => {
    if (field.current) field.current.value = '';
    setQuery('');
    field.current?.focus();
  };

  return (
    <div
      class="tk-catalog"
      data-testid="catalog"
      data-ready={data ? '' : undefined}
      data-failed={failed ? '' : undefined}
    >
      <div class="tk-catalog__head">
        <h1 id={titleId}>{text.title}</h1>
        {/* With no visible tools there is nothing to search: only the empty state shows (F-002.R6). */}
        {dataUrl && (
          <div
            class="tk-catalog__search"
            data-active={searching ? '' : undefined}
            data-disabled={failed ? '' : undefined}
          >
            <span
              class="tk-catalog__search-icon"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: text.icons.search }}
            />
            <label for={fieldId} class="tk-visually-hidden">
              {text.placeholder}
            </label>
            <input
              ref={field}
              id={fieldId}
              type="search"
              placeholder={text.placeholder}
              autocomplete="off"
              spellcheck={false}
              disabled={failed}
              aria-describedby={failed ? reasonId : undefined}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
          </div>
        )}
      </div>
      {dataUrl && (
        <p id={reasonId} class="tk-catalog__unavailable" role="status">
          {failed ? text.unavailable : null}
        </p>
      )}
      <p class="tk-visually-hidden" aria-live="polite" data-testid="catalog-count">
        {announcement}
      </p>
      {nav}
      {searching &&
        (results.length > 0 ? (
          <ul class="tk-catalog__grid" data-testid="catalog-results" aria-labelledby={titleId}>
            {results.map((tool) => (
              <li key={tool.id}>
                <ToolCard
                  tool={tool}
                  categoryName={categoryName.get(tool.category)}
                  // F-011.R3: offline, tools that need the internet are marked unavailable (MOD-Offline signal).
                  unavailable={!online.value && needsInternet(tool)}
                  text={text.card}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div class="tk-catalog__state">
            <StateMessage
              variant="no-results"
              page
              title={fill(text.noResults, 'query', query.trim())}
              iconSvg={text.icons.noResults}
            >
              <button type="button" data-primary onClick={clear}>
                {text.clear}
              </button>
            </StateMessage>
          </div>
        ))}
      <div class="tk-catalog__static" hidden={searching}>
        {children}
      </div>
    </div>
  );
}
