// MOD-Pages island on SCR-Settings: the theme choice (F-012.R2, COPY-settings.theme).
// Native radios in a fieldset give the radiogroup semantics and arrow-key movement; the change
// applies at once through MOD-Theme, with no reload.
import { useEffect, useState } from 'preact/hooks';
import { theme, type ThemePreference } from '../../theme/index.ts';

interface Props {
  /** The legend and the option labels, from COPY-settings.theme. */
  legend: string;
  options: { value: ThemePreference; label: string }[];
}

export default function ThemeChoice({ legend, options }: Props) {
  const [chosen, setChosen] = useState<ThemePreference | undefined>(undefined);
  useEffect(() => theme().preference.subscribe(setChosen), []);
  return (
    <fieldset class="choice">
      <legend>{legend}</legend>
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
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
