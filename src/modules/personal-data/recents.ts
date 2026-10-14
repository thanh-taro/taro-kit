// MOD-PersonalData: recents rules as pure functions over the stored document (ADR-0010).
// Implements: RULE-01 (20 stored, newest first, one entry per tool; shown lists hold at most 8 and leave out
// favorites), INV-04 (unknown or hidden ids stay stored and count toward the 20, but are filtered at read time),
// F-006.R2, F-006.R5. Visibility is always a parameter (MOD-Content's visible tool ids). Nothing here touches
// storage or the network (INV-05).
import type { PersonalData } from './document.ts';
import type { VisibleIds } from './favorites.ts';

/** ENT-RecentVisit: a tool id and the time it was last opened. */
export type RecentVisit = PersonalData['recents'][number];

/** RULE-01: at most 20 stored visits, hidden and unknown tools included. */
export const RECENTS_LIMIT = 20;
/** RULE-01: lists shown to the user (home, the palette's empty query) hold at most 8. */
export const RECENTS_SHOWN = 8;

export interface VisibleRecentsOptions {
  /** Leave out tools that are stored favorites (RULE-01). Default true. */
  excludeFavorites?: boolean;
  /** The most entries shown. Default RECENTS_SHOWN (8). */
  max?: number;
}

/**
 * RULE-01 record a visit: the tool moves to the top with the new time and is never duplicated; when more than
 * 20 would be stored, the oldest entry goes, whatever its tool's visibility. Returns a new document.
 */
export function recordRecentVisit(doc: PersonalData, toolId: string, openedAt: string): PersonalData {
  const rest = doc.recents.filter((r) => r.toolId !== toolId);
  return { ...doc, recents: [{ toolId, openedAt }, ...rest].slice(0, RECENTS_LIMIT) };
}

/** F-006.R4: clear all recents; the rest of the document is kept. */
export function clearRecentVisits(doc: PersonalData): PersonalData {
  return doc.recents.length === 0 ? doc : { ...doc, recents: [] };
}

/**
 * RULE-01 / INV-04: the recents that may be shown, newest first. Unknown or hidden tools are left out here (so
 * they reappear in their stored position once visible again), then favorites, then the list is capped.
 */
export function visibleRecents(
  doc: Pick<PersonalData, 'recents' | 'favorites'>,
  visibleIds: VisibleIds,
  { excludeFavorites = true, max = RECENTS_SHOWN }: VisibleRecentsOptions = {},
): RecentVisit[] {
  const visible = visibleIds instanceof Set ? visibleIds : new Set(visibleIds);
  const favorite = new Set(excludeFavorites ? doc.favorites.map((f) => f.toolId) : []);
  return doc.recents.filter((r) => visible.has(r.toolId) && !favorite.has(r.toolId)).slice(0, max);
}
