// MOD-Pages island on SCR-Settings: the language choice (F-019.R2, COPY-settings.language), next to the theme choice.
// Native radios in a fieldset (radiogroup semantics, arrow keys), in SCR-Settings' order: COPY-language.device, then
// COPY-language.en and COPY-language.vi, each name written in its own language and marked with it (F-019.R4). With no
// stored choice the device option is selected. Picking applies at once through MOD-Language and stores the choice;
// the device option removes it (F-019.AC5, AC24). Below 480 px the options stack (settings page CSS).
// Implements: F-019.R2 (settings).
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { language } from '../../language/index.ts';
import { L } from '../../language/L.tsx';
import type { Lang, Loc } from '../../language/languages.ts';

export type LanguageOption = 'device' | Lang;

interface Props {
  /** COPY-settings.language */
  legend: Loc;
  /** COPY-language.device in both languages; the language names, each in its own language. */
  device: Loc;
  names: Record<Lang, string>;
}

export default function LanguageChoice({ legend, device, names }: Props) {
  const [chosen, setChosen] = useState<LanguageOption | undefined>(undefined);
  useEffect(() => language().choice.subscribe((c) => setChosen(c ?? 'device')), []);
  const pick = (value: LanguageOption) => language().setLanguage(value === 'device' ? null : value);
  const option = (value: LanguageOption, label: ComponentChildren) => (
    <label key={value}>
      <input
        type="radio"
        name="language"
        value={value}
        checked={chosen === value}
        disabled={chosen === undefined}
        onChange={() => pick(value)}
      />
      {label}
    </label>
  );
  return (
    <fieldset class="choice choice--language">
      <legend>
        <L text={legend} />
      </legend>
      <div class="options">
        {option(
          'device',
          <span>
            <L text={device} />
          </span>,
        )}
        {option('en-US', <span lang="en-US">{names['en-US']}</span>)}
        {option('vi-VN', <span lang="vi-VN">{names['vi-VN']}</span>)}
      </div>
    </fieldset>
  );
}
