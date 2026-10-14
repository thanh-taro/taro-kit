// MOD-Content: bundled assets in content/assets/ (ADR-0005, NFR-05).
// Build-time only (Node). One table of image types serves both validation and the image route.
// Implements: F-001.R2 (assets are checked at build), F-009.R2 (project images).
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { ContentError } from './errors.ts';

/** The project image types the portal bundles, by extension (domain schema `project.image`). */
export const IMAGE_TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

/** The media type of an image by its extension, or undefined for an unknown one. */
export function imageType(path: string): string | undefined {
  const ext = /\.[A-Za-z0-9]+$/.exec(path)?.[0].toLowerCase();
  return ext ? IMAGE_TYPES[ext] : undefined;
}

/**
 * The absolute file of an asset path, or undefined when it would resolve outside `<contentDir>/assets/`.
 * A leading slash still means "inside the assets folder".
 */
export function assetFile(contentDir: string, path: string): string | undefined {
  const dir = resolve(contentDir, 'assets');
  const file = resolve(dir, path.replace(/^\/+/, ''));
  return file.startsWith(dir + sep) ? file : undefined;
}

/** Where an asset is named, for the ASSET error: the content file, the entry, the field and its line. */
export interface AssetSite {
  contentDir: string;
  file: string;
  entryId: string;
  field: string;
  line?: number;
}

/**
 * Validates one bundled asset path (ADR-0005, NFR-05): it must stay inside content/assets/, have one of `kinds`
 * (extensions such as `.png`; any when left out) and exist. Returns the absolute file, or pushes one ASSET error
 * naming the content file, entry and field to `errors` and returns undefined. Shared by every asset field
 * (tool and project icons, project images, category icons, the profile avatar).
 */
export function resolveAsset(
  path: string,
  site: AssetSite & { kinds?: readonly string[] },
  errors: ContentError[],
): string | undefined {
  const fail = (why: string) => {
    errors.push({
      file: site.file,
      line: site.line,
      entryId: site.entryId,
      rule: 'ASSET',
      message: `${site.field} "${path}" ${why}`,
    });
    return undefined;
  };
  const file = assetFile(site.contentDir, path);
  if (!file) return fail('is outside content/assets/');
  const ext = /\.[A-Za-z0-9]+$/.exec(path)?.[0].toLowerCase() ?? '';
  if (site.kinds && !site.kinds.includes(ext)) return fail(`is not one of ${site.kinds.join(', ')}`);
  if (!existsSync(file)) return fail('not found in content/assets/');
  return file;
}
