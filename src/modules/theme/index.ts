// MOD-Theme (scaffold): read and apply the theme shown on the page.
// Signals (`shownTheme`, `preference`) and live system-follow arrive with F-012.

export type ShownTheme = 'light' | 'dark';

/** The theme currently on the page, as set by the inline head script or the toggle. */
export const shownTheme = (): ShownTheme =>
  document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

export function applyTheme(theme: ShownTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}
