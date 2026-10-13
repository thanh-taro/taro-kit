// Reads specs/40-technical/dependencies.md (the registry, ADR-0008) into rows.
// Used by the notices generator and the scope-based license check.

export type Scope = 'runtime' | 'build' | 'dev' | 'ci';

export interface RegistryRow {
  id: string; // DEP-07
  names: string[]; // npm package names found in the "Package or asset" cell
  label: string; // the raw cell, for assets that are not packages
  scopes: Scope[]; // every scope word in the Scope cell
  shipped: boolean; // scope says runtime, or "+ ... shipped"
  license: string;
  status: 'candidate' | 'approved' | 'removed' | string;
}

const NPM_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

/** Package names in a registry cell: the listed names, plus those a note says it "pulls" in. */
export function packageNames(cell: string): string[] {
  if (/~~/.test(cell)) return [];
  const pulled = [...cell.matchAll(/\(pulls ([^)]*)\)/g)].map((m) => m[1]).join(',');
  const withoutNotes = cell.replace(/\([^)]*\)/g, ' ');
  return `${withoutNotes},${pulled}`
    .split(/[,+]/)
    .map((s) => s.trim())
    .filter((s) => NPM_NAME.test(s));
}

export function parseRegistry(markdown: string): RegistryRow[] {
  const rows: RegistryRow[] = [];
  for (const line of markdown.split('\n')) {
    const m = /^\|\s*\*\*(DEP-\d+)\*\*\s*\|(.*)\|\s*$/.exec(line.trim());
    if (!m) continue;
    const c = m[2].split('|').map((s) => s.trim());
    // | ID | Package or asset | Range | Purpose | Scope | License | Status | Decided by |
    const [label, , , scopeCell, license, status] = c;
    const scopes = (['runtime', 'build', 'dev', 'ci'] as const).filter((s) => new RegExp(`\\b${s}\\b`).test(scopeCell));
    rows.push({
      id: m[1],
      names: packageNames(label),
      label,
      scopes,
      shipped: scopes.includes('runtime') || /shipped/.test(scopeCell),
      license,
      status,
    });
  }
  return rows;
}
