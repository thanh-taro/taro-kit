// MOD-Language: localized attribute values on elements that can't hold both texts as children (ADR-0012).
// The element carries its en-US value (the no-script default, F-019.R8), both versions in `data-l-<attr>-<lang>`, and
// the attribute names in `data-l-a`, so one function swaps every one of them at load and on each change
// (`swapLocalizedAttributes`; its source is also inlined into the blocking script). Pure and browser-safe.
import { pick, shared, type Lang, type Text } from './languages.ts';

/**
 * The attributes for a localized `attr`: `{ [attr]: en-US value, 'data-l-a': attr, 'data-l-<attr>-<lang>': … }`.
 * Text that is the same in both languages is a plain attribute. Spread several into one element with `mergeAttrs`.
 */
export function localizedAttrs(attr: string, text: Text, showing: Lang = 'en-US'): Record<string, string> {
  const same = shared(text);
  if (same !== undefined) return { [attr]: same };
  return {
    [attr]: pick(text, showing),
    'data-l-a': attr,
    [`data-l-${attr}-en-US`]: pick(text, 'en-US'),
    [`data-l-${attr}-vi-VN`]: pick(text, 'vi-VN'),
  };
}

/** Several `localizedAttrs` on one element: their `data-l-a` lists are joined. */
export function mergeAttrs(...sets: Record<string, string>[]): Record<string, string> {
  const out: Record<string, string> = {};
  const names: string[] = [];
  for (const set of sets)
    for (const [k, v] of Object.entries(set)) {
      if (k === 'data-l-a') names.push(v);
      else out[k] = v;
    }
  if (names.length) out['data-l-a'] = names.join(' ');
  return out;
}

/**
 * Sets every localized attribute under `root` (and on `root` itself) to its version in `lang`. Self-contained: the
 * blocking script inlines its source. No comments inside: the source is collapsed onto one line.
 */
export function swapLocalizedAttributes(
  root: Pick<ParentNode, 'querySelectorAll'> & Partial<Pick<Element, 'getAttribute' | 'setAttribute'>>,
  lang: string,
): void {
  const one = (el: Pick<Element, 'getAttribute' | 'setAttribute'>) => {
    const names = (el.getAttribute('data-l-a') || '').split(' ');
    for (let i = 0; i < names.length; i++) {
      const value = names[i] ? el.getAttribute('data-l-' + names[i] + '-' + lang) : null;
      if (value !== null && el.getAttribute(names[i]!) !== value) el.setAttribute(names[i]!, value);
    }
  };
  if (root.getAttribute && root.setAttribute && root.getAttribute('data-l-a') !== null)
    one(root as Pick<Element, 'getAttribute' | 'setAttribute'>);
  const list = root.querySelectorAll('[data-l-a]');
  for (let i = 0; i < list.length; i++) one(list[i] as Element);
}
