// MOD-Shell island: the header theme quick toggle (CMP-AppShell; RULE-03).
// Scaffold version: flips and stores the theme. Live system-follow and the palette action come with F-012.
// Labels and icons arrive as props rendered at build, so the island ships no copy catalog or icon set.
import { useEffect, useState } from 'preact/hooks';
import { setTheme } from '../personal-data/theme-preference.ts';
import { applyTheme, shownTheme } from '../theme/index.ts';

type Theme = 'light' | 'dark';

interface Props {
  /** COPY-shell.themeToggle, rendered for each target theme. */
  labels: Record<Theme, string>;
  /** Inline SVG markup per target theme. */
  icons: Record<Theme, string>;
}

export default function ThemeToggle({ labels, icons }: Props) {
  const [shown, setShown] = useState<Theme>('dark');
  useEffect(() => setShown(shownTheme()), []);
  const next: Theme = shown === 'dark' ? 'light' : 'dark';
  const flip = () => {
    applyTheme(next);
    setTheme(next);
    setShown(next);
  };
  return (
    <button
      type="button"
      class="tk-iconbtn"
      aria-label={labels[next]}
      onClick={flip}
      dangerouslySetInnerHTML={{ __html: icons[next] }}
    />
  );
}
