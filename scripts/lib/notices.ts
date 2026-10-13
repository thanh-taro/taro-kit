// MOD-Delivery: dependencies.md -> /third-party-notices.txt (ADR-0008).
// Lists every registry entry that ships to browsers and is installed, with its license text,
// plus the attribution required for CC-BY-4.0 build data.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { RegistryRow } from './registry.ts';

export interface NoticePackage {
  name: string;
  version: string;
  license: string;
  licenseText?: string;
}

/** A direct dependency's folder, or a transitive one from pnpm's virtual store. */
function packageDir(root: string, name: string): string | undefined {
  const direct = join(root, 'node_modules', name);
  if (existsSync(join(direct, 'package.json'))) return direct;
  const store = join(root, 'node_modules', '.pnpm');
  if (!existsSync(store)) return undefined;
  const prefix = `${name.replace('/', '+')}@`;
  const hit = readdirSync(store)
    .filter((d) => d.startsWith(prefix))
    .sort()
    .pop();
  return hit ? join(store, hit, 'node_modules', name) : undefined;
}

export function readInstalledPackage(root: string, name: string): NoticePackage | undefined {
  const dir = packageDir(root, name);
  if (!dir) return undefined;
  const pkgFile = join(dir, 'package.json');
  if (!existsSync(pkgFile)) return undefined;
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as { version: string; license?: string };
  const licFile = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
  return {
    name,
    version: pkg.version,
    license: pkg.license ?? 'UNKNOWN',
    licenseText: licFile ? readFileSync(join(dir, licFile), 'utf8').trim() : undefined,
  };
}

export function noticeRows(rows: RegistryRow[]): RegistryRow[] {
  return rows.filter((r) => r.status !== 'removed' && (r.shipped || /CC-BY/.test(r.license)));
}

export function renderNotices(rows: RegistryRow[], lookup: (name: string) => NoticePackage | undefined): string {
  const parts: string[] = [
    'TaroKit third-party notices',
    '',
    'Generated from specs/40-technical/dependencies.md (ADR-0008). Lists the open-source code,',
    'fonts and data that TaroKit uses, with their licenses.',
  ];
  for (const row of noticeRows(rows)) {
    for (const name of row.names) {
      const pkg = lookup(name);
      if (!pkg) continue; // registered but not installed yet: nothing is shipped
      parts.push('', '='.repeat(72), `${pkg.name} ${pkg.version}  (${row.id}, ${pkg.license})`, '='.repeat(72));
      if (pkg.licenseText) parts.push('', pkg.licenseText);
    }
  }
  return parts.join('\n') + '\n';
}
