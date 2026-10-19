// MOD-Meta: the site index at /sitemap.xml (sitemaps.org 0.9; platform-mapping). Built from the registry, so a
// new or hidden entry needs no other edit (F-001.R1, RULE-06).
// Implements: F-015.R3.
import type { APIRoute } from 'astro';
import { getRegistry } from '../modules/content/index.ts';
import { siteIndexXml } from '../modules/meta/index.ts';

export const GET: APIRoute = () =>
  new Response(siteIndexXml(getRegistry()), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
