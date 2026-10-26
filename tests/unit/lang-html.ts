// Test helper (F-019, ADR-0012): rendered HTML as one language shows it. Every page holds both languages, each version
// marked `lang` + `data-l`; CSS hides the one not showing. `showing(html, lang)` removes the other language's versions,
// so assertions written for one language read the page as a visitor in that language would. The kept versions that are
// plain <span>s (<L>'s default) are unwrapped, so "<h2>Find me</h2>" reads as it did before both languages.
import type { Lang } from '../../src/modules/language/languages.ts';

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

export function showing(html: string, lang: Lang): string {
  const other = lang === 'en-US' ? 'vi-VN' : 'en-US';
  const marked = new RegExp(`\\slang="${other}"`);
  let out = '';
  let skipDepth = 0;
  const stack: string[] = [];
  // Depths of kept <span data-l> elements whose tags are dropped.
  const unwrapped: number[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|[^<]+|</g;
  for (const m of html.matchAll(re)) {
    const [token, closing, rawTag, attrs] = m;
    if (rawTag === undefined) {
      if (!skipDepth) out += token;
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (closing) {
      const at = stack.lastIndexOf(tag);
      const depth = at + 1;
      if (at >= 0) stack.length = at;
      if (skipDepth && stack.length < skipDepth) {
        skipDepth = 0;
        continue;
      }
      if (unwrapped.at(-1) === depth) {
        unwrapped.pop();
        continue;
      }
      if (!skipDepth) out += token;
      continue;
    }
    const isVoid = VOID.has(tag) || attrs!.endsWith('/');
    if (!skipDepth && /\sdata-l(=|\s|$|")/.test(attrs! + ' ') && marked.test(attrs!) && !isVoid) {
      stack.push(tag);
      skipDepth = stack.length;
      continue;
    }
    if (!isVoid) stack.push(tag);
    if (
      !skipDepth &&
      tag === 'span' &&
      /^\s*lang="[^"]*"\s+data-l(="")?\s*$/.test(attrs!.replace(/\s+data-astro-cid-[\w-]+(="[^"]*")?/g, ''))
    ) {
      unwrapped.push(stack.length);
      continue;
    }
    if (!skipDepth) out += token;
  }
  return out;
}

/** Shorthand: the HTML as English shows it. */
export const en = (html: string) => showing(html, 'en-US');
/** Shorthand: the HTML as Vietnamese shows it. */
export const vi = (html: string) => showing(html, 'vi-VN');
