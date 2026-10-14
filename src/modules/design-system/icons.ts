// MOD-DesignSystem: icons from the icon set (DEP-15), inlined at build (ADR-0003). No icon font, no sprite.
// Build-time only (reads node_modules); islands receive the rendered markup as props.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const iconDir = join(dirname(require.resolve('lucide-static/package.json')), 'icons');

export type IconSize = 16 | 20;

/** Inline SVG markup for a named icon, 1.5 px stroke (style.md), hidden from assistive tech. */
export function iconSvg(name: string, size: IconSize = 20): string {
  return svgFromFile(join(iconDir, `${name}.svg`), size);
}

/**
 * Inline SVG markup for a bundled SVG file from the icon set, such as a category icon copied into
 * content/assets/icons/ (DEP-44): the outer <svg> is replaced, so every icon gets the same 1.5 px stroke,
 * currentColor and aria-hidden, whatever the file declares. Build-time only.
 */
export function svgFromFile(file: string, size: IconSize = 20): string {
  const raw = readFileSync(file, 'utf8');
  const body = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s*\n\s*/g, '');
  return (
    `<svg class="tk-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`
  );
}
