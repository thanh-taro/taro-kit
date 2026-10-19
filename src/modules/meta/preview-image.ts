// MOD-Meta: the shared link-preview image (F-015.R1, F-015.R2, NFR-12), 1200 × 630, drawn from the Night Market
// dark tokens (DEP-17: generated from the tokens). Text is drawn as glyph outlines that `pnpm gen` extracts at
// build time (scripts/preview-glyphs.py), so the image is the same on every machine. Pure: no Node imports.
// Layout echoes the shell's logo (accent square with "T", the uppercase wordmark) above Taro's home line.
import { tokens } from '../../generated/tokens.ts';
import { PREVIEW_IMAGE } from './meta.ts';

/** One run of text as outlines: words in pixels, baseline at y = 0, each word starting at x = 0. */
export interface GlyphRun {
  words: { d: string; width: number }[];
  space: number;
  ascent: number;
  descent: number;
}
export type GlyphRuns = Record<'mark' | 'brand' | 'lead' | 'host', GlyphRun>;

const px = (v: string) => Number.parseFloat(v);
const base = tokens.base;
const dark = tokens.dark;

const SIZE = {
  mark: px(base['font-size-4xl']),
  brand: px(base['font-size-4xl']),
  lead: px(base['font-size-6xl']),
  host: px(base['font-size-2xl']),
};
const MARGIN = px(base['space-16']) + px(base['space-4']); // 80
const MARK_BOX = px(base['space-16']); // 64
const LINE = px(base['font-line-height-tight']);

/**
 * The glyph request for `pnpm gen` (scripts/preview-glyphs.py): which strings, in which face and size.
 * Fonts are the fontsource variable files (DEP-33, DEP-34, DEP-35), instanced at the token weights.
 */
export function previewGlyphRequest(text: { brand: string; lead: string; host: string }) {
  const display = 'unbounded/files/unbounded-latin-wght-normal.woff2';
  return {
    mark: { font: display, wght: Number(base['font-weight-bold']), size: SIZE.mark, text: 'T' },
    brand: {
      font: display,
      wght: Number(base['font-weight-semibold']),
      size: SIZE.brand,
      text: text.brand.toUpperCase(),
    },
    lead: {
      font: 'manrope/files/manrope-latin-wght-normal.woff2',
      wght: Number(base['font-weight-semibold']),
      size: SIZE.lead,
      text: text.lead,
    },
    host: {
      font: 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
      wght: Number(base['font-weight-medium']),
      size: SIZE.host,
      text: text.host,
    },
  };
}

/** Greedy line breaking of a run's words into lines no wider than `width`. */
function lines(run: GlyphRun, width: number) {
  const out: { words: GlyphRun['words']; width: number }[] = [];
  for (const word of run.words) {
    const last = out.at(-1);
    const next = last ? last.width + run.space + word.width : word.width;
    if (last && next <= width) {
      last.words.push(word);
      last.width = next;
    } else out.push({ words: [word], width: word.width });
  }
  return out;
}

/** A line of words at (x, baseline y), each word placed after the previous one and a space. */
function drawLine(words: GlyphRun['words'], space: number, x: number, y: number, fill: string, attrs = '') {
  let at = 0;
  const paths = words.map((w) => {
    const p = `<path transform="translate(${at.toFixed(2)} 0)" d="${w.d}"/>`;
    at += w.width + space;
    return p;
  });
  return `<g${attrs} transform="translate(${x} ${y})" fill="${fill}">${paths.join('')}</g>`;
}

const width = (run: GlyphRun) => run.words.reduce((s, w) => s + w.width, 0) + run.space * (run.words.length - 1);

export function previewSvg(runs: GlyphRuns): string {
  const { width: W, height: H } = PREVIEW_IMAGE;
  const content = W - 2 * MARGIN;

  // Logo row: the accent square with "T" centered, then the wordmark, vertically centered on the square.
  const top = MARGIN;
  const markX = MARGIN + (MARK_BOX - width(runs.mark)) / 2;
  const capCenter = (r: GlyphRun) => (r.ascent - r.descent) / 2;
  const markY = top + MARK_BOX / 2 + capCenter(runs.mark) * 0.72;
  const brandX = MARGIN + MARK_BOX + px(base['space-5']);
  const brandY = top + MARK_BOX / 2 + capCenter(runs.brand) * 0.72;

  // The lead, bottom-aligned above the footer.
  const leadLines = lines(runs.lead, content);
  const leadStep = SIZE.lead * LINE;
  const footerY = H - MARGIN;
  const leadLastBaseline = footerY - SIZE.host - px(base['space-12']);
  const leadFirstBaseline = leadLastBaseline - leadStep * (leadLines.length - 1);

  // Footer: the portal host, and one dot per category tint (RULE-14 tints, no names).
  const tints = ['violet', 'mango', 'sky', 'mint'] as const;
  const dot = px(base['space-4']);
  const gap = px(base['space-3']);
  const dots = tints
    .map((tint, i) => {
      const cx = W - MARGIN - dot / 2 - (tints.length - 1 - i) * (dot + gap);
      return `<circle cx="${cx}" cy="${footerY - dot / 2}" r="${dot / 2}" fill="${dark[`color-cat-${tint}-fg`]}"/>`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    '<defs><radialGradient id="glow" cx="0.85" cy="0" r="0.9">',
    `<stop offset="0" stop-color="${dark['color-bg-glow']}"/><stop offset="1" stop-color="${dark['color-bg']}"/>`,
    '</radialGradient></defs>',
    `<rect width="${W}" height="${H}" fill="url(#glow)"/>`,
    `<rect x="${MARGIN}" y="${top}" width="${MARK_BOX}" height="${MARK_BOX}" rx="${px(base['radius-lg'])}" fill="${dark['color-accent']}"/>`,
    drawLine(runs.mark.words, 0, markX, markY, dark['color-on-accent']),
    drawLine(runs.brand.words, runs.brand.space, brandX, brandY, dark['color-fg']),
    ...leadLines.map((line, i) =>
      drawLine(
        line.words,
        runs.lead.space,
        MARGIN,
        leadFirstBaseline + i * leadStep,
        dark['color-fg'],
        ` data-line="${i}"`,
      ),
    ),
    drawLine(runs.host.words, runs.host.space, MARGIN, footerY, dark['color-muted']),
    dots,
    '</svg>',
  ].join('');
}
