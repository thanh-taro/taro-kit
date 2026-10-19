// DEP-17 brand assets: rasterizes the app icon sources in assets/brand/ into the committed PNGs in public/icons/
// that manifest.webmanifest lists (ADR-0004: icons are committed design assets, not generated at build), and writes
// the favicon <BaseLayout> links (FAVICONS): the app icon SVG copied as-is, plus a 32 px PNG fallback.
// Run by hand after changing a source: `node scripts/brand-icons.ts`. Uses sharp (DEP-31).
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const out = (name: string) => join(root, 'public/icons', name);
const src = (name: string) => join(root, 'assets/brand', name);

const jobs: [source: string, size: number, file: string][] = [
  ['app-icon.svg', 192, 'icon-192.png'],
  ['app-icon.svg', 512, 'icon-512.png'],
  ['app-icon-maskable.svg', 512, 'icon-maskable-512.png'],
  ['app-icon.svg', 32, 'favicon-32.png'],
];
for (const [source, size, file] of jobs) {
  await sharp(src(source), { density: (72 * size) / 512 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toFile(out(file));
  console.log(`brand-icons: public/icons/${file} (${size} px)`);
}
copyFileSync(src('app-icon.svg'), out('favicon.svg'));
console.log('brand-icons: public/icons/favicon.svg (copied from assets/brand/app-icon.svg)');
