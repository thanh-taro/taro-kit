// MOD-Language `<L>` for islands and Astro pages alike (ADR-0012): a text in both languages, each version in its own
// element marked `lang` + `data-l`, so CSS shows the one in the language showing and switching needs no render.
// Text that is the same in both languages renders once, with no `lang` of its own (it inherits the language showing).
// `<Each>` renders any markup once per language (policy bodies, résumé periods), wrapped the same way.
import type { ComponentChildren, JSX } from 'preact';
import { LANGUAGES, shared, type Lang, type Text } from './languages.ts';

type Tag = keyof JSX.IntrinsicElements;
type Rest = Record<string, unknown>;

/** The attributes that mark an element as one language's version (ADR-0012). */
export const langAttrs = (lang: Lang) => ({ lang, 'data-l': '' });

export function L({ text, as = 'span', ...rest }: { text: Text; as?: Tag } & Rest) {
  const Tag = as as unknown as (props: Rest) => JSX.Element;
  const same = shared(text);
  if (same !== undefined)
    return as === 'span' && Object.keys(rest).length === 0 ? <>{same}</> : <Tag {...rest}>{same}</Tag>;
  return (
    <>
      {LANGUAGES.map((lang) => (
        <Tag key={lang} {...rest} {...langAttrs(lang)}>
          {(text as Record<Lang, string>)[lang]}
        </Tag>
      ))}
    </>
  );
}

/** `render(lang)` once per language, each wrapped in `as` (default span) marked with that language. */
export function Each({ render, as = 'span', ...rest }: { render: (lang: Lang) => ComponentChildren; as?: Tag } & Rest) {
  const Tag = as as unknown as (props: Rest) => JSX.Element;
  return (
    <>
      {LANGUAGES.map((lang) => (
        <Tag key={lang} {...rest} {...langAttrs(lang)}>
          {render(lang)}
        </Tag>
      ))}
    </>
  );
}
