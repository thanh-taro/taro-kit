// MOD-DesignSystem: build-time strings and icons for the CMP-FavoriteToggle and CMP-ToolCard islands.
// Build-time only (MOD-Copy and the icon set are read in Node); islands receive the results as props,
// so they ship no copy catalog or icon files.
import { t } from '../copy/index.ts';
import { FAVORITES_LIMIT } from '../personal-data/favorites.ts';
import type { FavoriteToggleLabels } from './FavoriteToggle.tsx';
import { iconSvg, type IconSize } from './icons.ts';
import type { ToolCardText } from './ToolCard.tsx';

/** CMP-FavoriteToggle labels: COPY-fav.add, COPY-fav.remove and COPY-fav.full with the RULE-02 limit. */
export const favoriteToggleLabels = (): FavoriteToggleLabels => ({
  add: t('COPY-fav.add'),
  remove: t('COPY-fav.remove'),
  full: t('COPY-fav.full', { limit: FAVORITES_LIMIT }),
});

/** The star icon of CMP-FavoriteToggle (style.md: 16 and 20 px). */
export const favoriteStar = (size: IconSize = 20): string => iconSvg('star', size);

/** Everything a Preact `ToolCard` needs besides the tool: pass it once to the island that lists cards. */
export const toolCardText = (): ToolCardText => ({
  favorite: favoriteToggleLabels(),
  opensNewTab: t('COPY-tool.opensNewTab'),
  unavailable: t('COPY-tool.unavailable'),
  icons: {
    star: favoriteStar(20),
    starSmall: favoriteStar(16),
    newTab: iconSvg('external-link', 16),
    offline: iconSvg('wifi-off', 16),
  },
});
