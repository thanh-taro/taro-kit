// MOD-Meta: the site index (`/sitemap.xml`, sitemaps.org 0.9) and `/robots.txt` (platform-mapping). Pure.
// Implements: F-015.R3 (public pages, visible category pages and visible tools' portal addresses; RULE-06).
import { sitemapEntries } from '../content/derive.ts';

type SiteIndexSource = Parameters<typeof sitemapEntries>[0] & { portalOrigin: string };

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function siteIndexXml(registry: SiteIndexSource): string {
  const urls = sitemapEntries(registry).map(
    (path) => `  <url><loc>${escapeXml(registry.portalOrigin + path)}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

export const robotsTxt = (origin: string): string => `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
