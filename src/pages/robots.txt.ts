// MOD-Meta: /robots.txt, pointing crawlers at the site index (platform-mapping).
// Implements: F-015.R3.
import type { APIRoute } from 'astro';
import { getRegistry } from '../modules/content/index.ts';
import { robotsTxt } from '../modules/meta/index.ts';

export const GET: APIRoute = () =>
  new Response(robotsTxt(getRegistry().portalOrigin), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
