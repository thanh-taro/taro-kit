// MOD-Pages: build-time strings and icons for the SCR-Catalog search island (MOD-Copy and the icon set are read
// in Node; the island receives the result as props). Placeholders the island fills are left in literally.
import { tBoth } from '../../copy/index.ts';
import { iconSvg } from '../../design-system/icons.ts';
import { toolCardText } from '../../design-system/text.ts';
import type { CatalogSearchText } from './CatalogSearch.tsx';

export const catalogSearchText = (): CatalogSearchText => ({
  title: tBoth('COPY-catalog.title'),
  placeholder: tBoth('COPY-catalog.searchPlaceholder'),
  noResults: tBoth('COPY-catalog.noResults', { query: '{query}' }),
  clear: tBoth('COPY-catalog.clear'),
  unavailable: tBoth('COPY-catalog.searchUnavailable'),
  count: { one: tBoth('COPY-category.toolCountOne'), other: tBoth('COPY-category.toolCount', { count: '{count}' }) },
  card: toolCardText(),
  icons: { search: iconSvg('search', 16), noResults: iconSvg('search-x') },
});
