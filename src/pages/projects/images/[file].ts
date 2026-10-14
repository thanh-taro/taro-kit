// MOD-Pages: a visible project's bundled image, copied from content/assets/ at build and served at
// /projects/images/<id>.<ext> (projectImagePath). Hidden projects get none (RULE-06).
// Implements: F-009.R2.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { APIRoute, GetStaticPaths } from 'astro';
import { contentDirectory, getRegistry } from '../../../modules/content/index.ts';
import { projectImagePath } from '../../../modules/pages/projects/index.ts';

export const getStaticPaths = (() =>
  getRegistry().projects.flatMap((p) => {
    const path = projectImagePath(p);
    if (!path || !p.image) return [];
    return [
      {
        params: { file: path.slice('/projects/images/'.length) },
        props: { source: join(contentDirectory(), 'assets', p.image.replace(/^\//, '')) },
      },
    ];
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(readFileSync((props as { source: string }).source));
