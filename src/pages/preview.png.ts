// MOD-Meta: the shared link-preview image at /preview.png, 1200 × 630 (NFR-12), rasterized at build by sharp
// (DEP-31) from the token-drawn SVG and the glyph outlines `pnpm gen` extracted (src/generated/preview-glyphs.json).
// Implements: F-015.R1, F-015.R2.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import glyphs from '../generated/preview-glyphs.json';
import { PREVIEW_IMAGE, previewSvg, type GlyphRuns } from '../modules/meta/index.ts';

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(previewSvg(glyphs as GlyphRuns)))
    .removeAlpha() // opaque: some preview services show transparency as black or white
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': PREVIEW_IMAGE.type } });
};
