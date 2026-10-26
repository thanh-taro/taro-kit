// MOD-Pages island on SCR-Settings: the theme choice (F-012.R2, COPY-settings.theme).
// Native radios in a fieldset give the radiogroup semantics and arrow-key movement; the change
// applies at once through MOD-Theme, with no reload.
// Legend and labels are in both languages (<L>, F-019.R4).
import { useEffect, useState } from 'preact/hooks';
import { L } from '../../language/L.tsx';
import type { Loc } from '../../language/languages.ts';
import { theme, type ThemePreference } from '../../theme/index.ts';

interface Props {
  /** The legend and the option labels, from COPY-settings.theme. */
  legend: Loc;
  options: { value: ThemePreference; label: Loc }[];
}

export default function ThemeChoice({ legend, options }: Props) {
  const [chosen, setChosen] = useState<ThemePreference | undefined>(undefined);
  useEffect(() => theme().preference.subscribe(setChosen), []);
  return (
    <fieldset class="choice">
      <legend>
        <L text={legend} />
      </legend>
      <div class="options">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={chosen === o.value}
              disabled={chosen === undefined}
              onChange={() => theme().setPreference(o.value)}
            />
            <span>
              <L text={o.label} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
