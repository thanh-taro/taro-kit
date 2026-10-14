// MOD-DesignSystem: CMP-ToolCard logic shared by the Astro and Preact versions. Browser-safe, no Node imports.
import { toolPath } from '../content/derive.ts';

/** The tool fields a card shows (a MOD-Content `CatalogTool` or `RegTool` fits). */
export interface ToolCardTool {
  id: string;
  name: string;
  summary: string;
  openMode: 'embedded' | 'linked';
  /** The tool's own address (used by linked tools). */
  url: string;
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
