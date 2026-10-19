// MOD-Pages route for MOD-Offline's web app manifest (F-011.R1, ADR-0004): a static file at build.
import type { APIRoute } from 'astro';
import { webManifest } from '../modules/offline/manifest.ts';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(webManifest(), null, 2), {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
