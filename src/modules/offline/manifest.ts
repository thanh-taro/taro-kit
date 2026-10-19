// MOD-Offline: the web app manifest (ADR-0004), served at /manifest.webmanifest (src/pages/manifest.webmanifest.ts).
// The name comes from MOD-Copy and the colors from the design tokens (dark is the default theme, style.md).
// The icons are committed brand assets (DEP-17): sources in assets/brand/, PNGs in public/icons/
// (scripts/brand-icons.ts). Browser-safe, no Node imports.
// Implements: F-011.R1 (installable through the browser's own option, its own window, TaroKit name and icon).
import { tokens } from '../../generated/tokens.ts';
import { t } from '../copy/index.ts';

export const MANIFEST_PATH = '/manifest.webmanifest';

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: 'image/png';
  purpose?: 'maskable';
}

export const MANIFEST_ICONS: readonly ManifestIcon[] = [
  { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export function webManifest() {
  const name = t('COPY-shell.brand');
  return {
    id: '/',
    name,
    short_name: name,
    description: t('COPY-meta.homeDescription'),
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone' as const,
    background_color: tokens.dark['color-bg'],
    theme_color: tokens.dark['color-bg'],
    icons: [...MANIFEST_ICONS],
  };
}
