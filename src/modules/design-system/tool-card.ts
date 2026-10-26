// MOD-DesignSystem: CMP-ToolCard logic shared by the Astro and Preact versions. Browser-safe, no Node imports.
import { toolPath } from '../content/derive.ts';
import type { Text } from '../language/languages.ts';

/** The tool fields a card shows (a MOD-Content `CatalogTool` or `RegTool` fits). */
export interface ToolCardTool {
  id: string;
  name: string;
  /** In both languages (INV-09); rendered through <L>. */
  summary: Text;
  openMode: 'embedded' | 'linked';
  /** The tool's own address (used by linked tools). */
  url: string;
  /** The offline-capable flag (ENT-Tool, default false). */
  offline?: boolean;
}

export type ToolCardVariant = 'regular' | 'compact';

/**
 * Where the card goes (CMP-ToolCard behavior, F-003):
 * - an embedded tool opens its portal address `/t/<id>/` in the same tab (F-003.R1);
 * - a linked tool opens its own address in a new tab and the portal stays where it was (F-003.R4), so the
 *   card carries the "Opens in a new tab" marker (F-002.R2, COPY-tool.opensNewTab).
 */
export function toolCardLink(tool: Pick<ToolCardTool, 'id' | 'openMode' | 'url'>): {
  href: string;
  newTab: boolean;
} {
  return tool.openMode === 'linked' ? { href: tool.url, newTab: true } : { href: toolPath(tool.id), newTab: false };
}

/**
 * F-011.R3: offline, a card is marked unavailable when its tool needs the internet: every linked tool, and every
 * embedded tool that is not offline-capable (CMP-ToolCard unavailable state).
 */
export function needsInternet(tool: Pick<ToolCardTool, 'openMode' | 'offline'>): boolean {
  return tool.openMode === 'linked' || !tool.offline;
}

/** style.md: a tool without an icon shows its monogram in mono, the initials of its first two words. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => [...w][0] ?? '')
    .join('')
    .toUpperCase();
}

/** Space-separated ids for aria-describedby, or undefined when there are none. */
export const describedBy = (...ids: (string | false | undefined)[]): string | undefined =>
  ids.filter(Boolean).join(' ') || undefined;
