// MOD-Language: its part of the blocking script that runs before first paint (F-019.R3, ADR-0012). MOD-Theme merges it
// into its inline script, so one CSP hash covers both. Before anything paints it resolves the language showing (the
// stored choice, else RULE-16 from the device's preferred languages) and, only when that is vi-VN, sets `lang` and
// `data-lang` on <html> (the built HTML says en-US, F-019.R8), the page title from <title data-l-vi-VN>, and every
// localized attribute: those already parsed at once, the rest as the parser adds them (a MutationObserver until the
// document is parsed), so no English attribute value is ever painted.
// Each inlined function is self-contained; no comments inside them (their source is collapsed onto one line).
import { readStoredLanguage } from '../personal-data/read-stored-theme.ts';
import { swapLocalizedAttributes } from './attrs.ts';
import { resolveLanguage } from './resolve.ts';

function languageMain(
  read: typeof readStoredLanguage,
  resolve: typeof resolveLanguage,
  swap: typeof swapLocalizedAttributes,
): void {
  const d = document;
  let device: readonly string[] = [];
  try {
    device = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  } catch {
    device = [];
  }
  const lang = resolve(read(), device);
  if (lang === 'en-US') return;
  const root = d.documentElement;
  root.setAttribute('lang', lang);
  root.setAttribute('data-lang', lang);
  const title = d.querySelector('title');
  const text = title && title.getAttribute('data-l-' + lang);
  if (text) d.title = text;
  swap(d, lang);
  if (typeof MutationObserver !== 'function') return;
  const seen = new MutationObserver(function (records) {
    for (let i = 0; i < records.length; i++) {
      const added = records[i]!.addedNodes;
      for (let j = 0; j < added.length; j++) if (added[j]!.nodeType === 1) swap(added[j] as Element, lang);
    }
  });
  seen.observe(root, { childList: true, subtree: true });
  d.addEventListener('DOMContentLoaded', function () {
    seen.disconnect();
    swap(d, lang);
  });
}

/** The language part of the blocking script (build-time source; MOD-Theme's inline script includes it). */
export const languageInlineScript = `(${languageMain})(${readStoredLanguage},${resolveLanguage},${swapLocalizedAttributes});`;
