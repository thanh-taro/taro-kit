// MOD-Shell: build-time strings and icons for the shell's islands (MOD-Copy and the icon set are read in Node).
import { t, tBoth } from '../copy/index.ts';
import { iconSvg } from '../design-system/icons.ts';
import { LANGUAGES, type Loc } from '../language/languages.ts';
import type { LanguageSwitchText } from './LanguageSwitch.tsx';
import type { ShellStatusText } from './ShellStatus.tsx';

export const shellStatusText = (): ShellStatusText => ({
  offline: tBoth('COPY-shell.offline'),
  updateReady: tBoth('COPY-shell.updateReady'),
  refresh: tBoth('COPY-shell.refresh'),
  icons: { offline: iconSvg('wifi-off', 16), update: iconSvg('star', 16) },
});

const MARK = '\u0000';

/** CMP-AppShell's language switch: COPY-shell.languageSwitch split around {language}, and the two names. */
export function languageSwitchText(): LanguageSwitchText {
  const full = tBoth('COPY-shell.languageSwitch', { language: MARK });
  const before = {} as Loc;
  const after = {} as Loc;
  for (const lang of LANGUAGES) [before[lang], after[lang]] = full[lang].split(MARK) as [string, string];
  return {
    before,
    after,
    names: { 'en-US': t('COPY-language.en', undefined, 'en-US'), 'vi-VN': t('COPY-language.vi', undefined, 'vi-VN') },
    icon: iconSvg('globe', 16),
  };
}
