// MOD-Language for islands: the language showing as Preact state (F-019.R2, ADR-0012).
// It starts at en-US, the language of the built HTML, so the first client render matches the server's (hydration),
// and follows the page's language after that. Islands use it only for what they compute at run time (results,
// counts, attribute values); their visible text renders both languages with <L> and needs no render to switch.
import { useEffect, useState } from 'preact/hooks';
import { language } from './index.ts';
import { DEFAULT_LANGUAGE, type Lang } from './languages.ts';

export function useShownLanguage(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANGUAGE);
  useEffect(() => language().shownLanguage.subscribe(setLang), []);
  return lang;
}
