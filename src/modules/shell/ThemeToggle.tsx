// MOD-Shell island: the header theme quick toggle (CMP-AppShell, F-012.R3, RULE-03).
// Switches to the opposite of the theme showing and stores that choice (MOD-Theme `toggle`).
// Labels and icons arrive as props rendered at build, so the island ships no copy catalog or icon set.
import { useEffect, useState } from 'preact/hooks';
import { theme, type ShownTheme } from '../theme/index.ts';
import { useHydrated } from './hydrated.ts';

interface Props {
  /** COPY-shell.themeToggle, rendered for each target theme. */
  labels: Record<ShownTheme, string>;
  /** Inline SVG markup per target theme. */
  icons: Record<ShownTheme, string>;
}

export default function ThemeToggle({ labels, icons }: Props) {
  const hydrated = useHydrated();
  const [shown, setShown] = useState<ShownTheme>('dark');
  // Subscribes after hydration: the build has no device, so the first client render matches the server's.
  useEffect(() => theme().shownTheme.subscribe(setShown), []);
  const next: ShownTheme = shown === 'dark' ? 'light' : 'dark';
  // `icons` are build-time SVG from the icon set (DEP-15), never user or runtime data.
  return (
    <button
      type="button"
      class="tk-iconbtn"
      aria-label={labels[next]}
      disabled={!hydrated}
      onClick={() => theme().toggle()}
      dangerouslySetInnerHTML={{ __html: icons[next] }}
    />
  );
}
