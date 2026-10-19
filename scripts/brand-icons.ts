// DEP-17 brand assets: rasterizes the app icon sources in assets/brand/ into the committed PNGs in public/icons/
// that manifest.webmanifest lists (ADR-0004: icons are committed design assets, not generated at build).
// Run by hand after changing a source: `node scripts/brand-icons.ts`. Uses sharp (DEP-31).
import sharp from 'sharp';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const out = (name: string) => join(root, 'public/icons', name);
const src = (name: string) => join(root, 'assets/brand', name);

const jobs: [source: string, size: number, file: string][] = [
  ['app-icon.svg', 192, 'icon-192.png'],
  ['app-icon.svg', 512, 'icon-512.png'],
  ['app-icon-maskable.svg', 512, 'icon-maskable-512.png'],
];
for (const [source, size, file] of jobs) {
  await sharp(src(source), { density: (72 * size) / 512 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toFile(out(file));
  console.log(`brand-icons: public/icons/${file} (${size} px)`);
}
