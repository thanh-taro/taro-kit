// ADR-0008 scope-based license policy, as pure functions over `pnpm licenses list --json` and the registry.
import type { RegistryRow } from './registry.ts';

/** Allowed for anything, including code and assets shipped to browsers. */
export const ALLOWED_ANYWHERE = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'Apache-2.0',
  'Unlicense',
  'CC0-1.0',
  'BlueOak-1.0.0',
  'Python-2.0',
  'OFL-1.1',
]);

/** Allowed only for build and dev tools used unmodified and never shipped (D-023). */
export const BUILD_ONLY = new Set([
  'MPL-2.0',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'CC-BY-4.0',
]);

export interface InstalledPackage {
  name: string;
  versions: string[];
  license: string;
}

/** pnpm groups packages by license: { "MIT": [{ name, versions, ... }], ... }. */
export function flattenPnpmLicenses(json: Record<string, { name: string; versions: string[] }[]>): InstalledPackage[] {
  return Object.entries(json).flatMap(([license, pkgs]) =>
    pkgs.map((p) => ({ name: p.name, versions: p.versions, license })),
  );
}

/** Split a simple SPDX expression into its OR-alternatives, each a list of AND-ed licenses. */
export function spdxAlternatives(expr: string): string[][] {
  return expr
    .replace(/[()]/g, ' ')
    .split(/\s+OR\s+/i)
    .map((alt) =>
      alt
        .split(/\s+AND\s+/i)
        .map((s) => s.trim())
        .filter(Boolean),
    );
}

/** The registry row that names this package (exactly, or as a platform variant such as lightningcss-darwin-arm64). */
export function registryRowFor(name: string, rows: RegistryRow[]): RegistryRow | undefined {
  return rows.find((r) => r.status !== 'removed' && r.names.some((n) => name === n || name.startsWith(`${n}-`)));
}

export interface Verdict {
  ok: boolean;
  reason: string;
}

export function judge(pkg: InstalledPackage, rows: RegistryRow[]): Verdict {
  const alts = spdxAlternatives(pkg.license);
  if (alts.some((all) => all.every((l) => ALLOWED_ANYWHERE.has(l)))) return { ok: true, reason: 'permissive' };
  if (alts.some((all) => all.every((l) => ALLOWED_ANYWHERE.has(l) || BUILD_ONLY.has(l)))) {
    const row = registryRowFor(pkg.name, rows);
    if (!row)
      return {
        ok: false,
        reason: `${pkg.license} is allowed only for registered build/dev packages; ${pkg.name} is not in dependencies.md`,
      };
    if (row.shipped) return { ok: false, reason: `${pkg.license} must not ship, but ${row.id} has runtime scope` };
    return { ok: true, reason: `build/dev only (${row.id})` };
  }
  return { ok: false, reason: `license ${pkg.license} is not allowed (ADR-0008)` };
}
