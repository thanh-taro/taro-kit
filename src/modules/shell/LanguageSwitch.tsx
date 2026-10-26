// MOD-Shell: CMP-AppShell's language switch (F-019.R2), rendered at build in the header bar and inside NavMenu's
// narrow menu (a full-width row). Its visible text is the other language's name, marked with its own language
// (COPY-language.en / COPY-language.vi); its accessible name comes from its content: COPY-shell.languageSwitch with the
// prefix visually hidden in the bar and visible in the menu row. In the bar both names share one grid cell and the
// one not offered is `visibility: hidden`, so the width is the same in both languages (CMP-AppShell). The control is
// armed by MOD-Language's delegated listener (`data-tk-language-switch`), so it works before any island hydrates
// and a click leaves focus on it. Styles: global.css (`.tk-langswitch`), shared by both places.
// Implements: F-019.R2 (the header switch), F-019.R4 (the names marked with their language).
import { L } from '../language/L.tsx';
import { LANGUAGE_SWITCH_ATTR } from '../language/switch-attr.ts';
import type { Loc } from '../language/languages.ts';

export interface LanguageSwitchText {
  /** COPY-shell.languageSwitch around {language}, per language showing. */
  before: Loc;
  after: Loc;
  /** COPY-language.en and COPY-language.vi: each language's name in its own language. */
  names: { 'en-US': string; 'vi-VN': string };
  /** Build-time SVG markup of the globe icon (16 px). */
  icon: string;
}

export default function LanguageSwitch({ text, row = false }: { text: LanguageSwitchText; row?: boolean }) {
  const affix = row ? undefined : 'tk-visually-hidden';
  const attrs = { [LANGUAGE_SWITCH_ATTR]: '' };
  return (
    <button type="button" class={row ? 'tk-langswitch tk-langswitch--row' : 'tk-langswitch'} {...attrs}>
      {/* `icon` is build-time SVG from the icon set (DEP-15), never user or runtime data. */}
      <span class="tk-langswitch__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: text.icon }} />
      <span class="tk-langswitch__label">
        <span class={affix}>
          <L text={text.before} />
        </span>
        <span class="tk-langswitch__names">
          <span lang="vi-VN" data-to="vi-VN">
            {text.names['vi-VN']}
          </span>
          <span lang="en-US" data-to="en-US">
            {text.names['en-US']}
          </span>
        </span>
        {text.after['en-US'] || text.after['vi-VN'] ? (
          <span class={affix}>
            <L text={text.after} />
          </span>
        ) : null}
      </span>
    </button>
  );
}
