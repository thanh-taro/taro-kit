// MOD-Theme: the browser's theme color (the installed window's title bar, F-011.R1) for each theme, from the design
// tokens' `bg`. The head carries one `<meta name="theme-color">` per device color scheme (dark when the device has
// no preference, D-019); once the page knows the theme showing, every such meta takes that theme's color, so a
// stored light or dark choice overrides the device setting (RULE-03). Browser-safe, no Node imports.
import { tokens } from '../../generated/tokens.ts';

export const THEME_COLORS = { light: tokens.light['color-bg'], dark: tokens.dark['color-bg'] } as const;

/** Sets every theme-color meta of `doc` to the color of `shown`. */
export function applyThemeColor(doc: Pick<Document, 'querySelectorAll'>, shown: 'light' | 'dark'): void {
  for (const meta of doc.querySelectorAll('meta[name="theme-color"]'))
    meta.setAttribute('content', THEME_COLORS[shown]);
}
