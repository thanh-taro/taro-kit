// MOD-Pages: build-time strings and icons for the SCR-Catalog search island (MOD-Copy and the icon set are read
// in Node; the island receives the result as props). Placeholders the island fills are left in literally.
import { t } from '../../copy/index.ts';
import { iconSvg } from '../../design-system/icons.ts';
import { toolCardText } from '../../design-system/text.ts';
import type { CatalogSearchText } from './CatalogSearch.tsx';

export const catalogSearchText = (): CatalogSearchText => ({
  title: t('COPY-catalog.title'),
  placeholder: t('COPY-catalog.searchPlaceholder'),
  noResults: t('COPY-catalog.noResults', { query: '{query}' }),
  clear: t('COPY-catalog.clear'),
  unavailable: t('COPY-catalog.searchUnavailable'),
  count: { one: t('COPY-category.toolCountOne'), other: t('COPY-category.toolCount', { count: '{count}' }) },
  card: toolCardText(),
  icons: { search: iconSvg('search', 16), noResults: iconSvg('search-x') },
});
