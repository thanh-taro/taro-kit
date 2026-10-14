// MOD-Pages: a visible project's bundled image, copied from content/assets/ at build and served at
// /projects/images/<id>.<ext> (projectImagePath), with its media type from MOD-Content's IMAGE_TYPES.
// Hidden projects get none (RULE-06). The path was validated by MOD-Content (inside content/assets/, a known type).
// Implements: F-009.R2.
import { readFileSync } from 'node:fs';
import type { APIRoute, GetStaticPaths } from 'astro';
import { assetFile, contentDirectory, getRegistry, imageType } from '../../../modules/content/index.ts';
import { projectImagePath } from '../../../modules/pages/projects/index.ts';

export const getStaticPaths = (() =>
  getRegistry().projects.flatMap((p) => {
    const path = projectImagePath(p);
    const source = p.image && assetFile(contentDirectory(), p.image);
    const type = p.image && imageType(p.image);
    if (!path || !source || !type) return [];
    return [{ params: { file: path.slice('/projects/images/'.length) }, props: { source, type } }];
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const { source, type } = props as { source: string; type: string };
  return new Response(readFileSync(source), { headers: { 'Content-Type': type } });
};
