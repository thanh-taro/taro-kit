// MOD-PersonalData: favorites rules as pure functions over the stored document (ADR-0010).
// Implements: RULE-02 (visible limit, pin order, drop-hidden-first), INV-04 (unknown or hidden ids are kept
// in storage but never shown; filtered at read time, never at write time), F-005.R3, F-005.R4.
// Visibility is always a parameter: the set of visible tool ids derived by MOD-Content's registry
// functions (RULE-06). Nothing here touches storage or the network (INV-05).
import type { PersonalData } from './document.ts';

/** ENT-Favorite: a tool id and the time it was pinned. */
export type Favorite = PersonalData['favorites'][number];

/** RULE-02: at most 24 visible favorites, and at most 24 stored in total. */
export const FAVORITES_LIMIT = 24;

/** `pin` outcome: pinned (or already pinned), or refused because 24 visible favorites exist (RULE-02). */
export type PinResult = 'ok' | 'full';

/** The ids of visible tools, as a set or any iterable (MOD-Content `visibleTools`). */
export type VisibleIds = ReadonlySet<string> | Iterable<string>;

const asSet = (ids: VisibleIds): ReadonlySet<string> => (ids instanceof Set ? ids : new Set(ids));

/** True when the tool is stored as a favorite, visible or not. */
export const isFavorite = (doc: Pick<PersonalData, 'favorites'>, toolId: string): boolean =>
  doc.favorites.some((f) => f.toolId === toolId);

/**
 * INV-04 / RULE-02: the favorites that may be shown, in pin order (oldest first). Favorites whose tool is
 * unknown or hidden are left out here and stay in storage, so they reappear once the tool is visible again.
 */
export function visibleFavorites(favorites: readonly Favorite[], visibleIds: VisibleIds): Favorite[] {
  const visible = asSet(visibleIds);
  return favorites.filter((f) => visible.has(f.toolId));
}

/**
 * RULE-02 pin. The stored list is kept in pin order, so a new favorite is appended.
 * - Already a favorite: `ok`, nothing changes.
 * - A 25th visible favorite is refused: `full`, nothing changes (F-005.AC4).
 * - When storage would hold more than 24, the oldest favorites for unknown or hidden tools are dropped
 *   first (F-005.AC6). If none can be dropped, the pin is refused.
 * Returns the new document (a copy; the input is never mutated).
 */
export function pinFavorite(
  doc: PersonalData,
  toolId: string,
  visibleIds: VisibleIds,
  pinnedAt: string,
): { result: PinResult; doc: PersonalData } {
  if (isFavorite(doc, toolId)) return { result: 'ok', doc };
  const visible = asSet(visibleIds);
  if (visible.has(toolId) && visibleFavorites(doc.favorites, visible).length >= FAVORITES_LIMIT)
    return { result: 'full', doc };
  const favorites = [...doc.favorites];
  while (favorites.length >= FAVORITES_LIMIT) {
    const oldestHidden = favorites.findIndex((f) => !visible.has(f.toolId));
    if (oldestHidden < 0) return { result: 'full', doc };
    favorites.splice(oldestHidden, 1);
  }
  favorites.push({ toolId, pinnedAt });
  return { result: 'ok', doc: { ...doc, favorites } };
}

/** Unpin: removes the tool from the stored favorites (F-005.R1). Unknown ids leave the document as it is. */
export function unpinFavorite(doc: PersonalData, toolId: string): PersonalData {
  return isFavorite(doc, toolId) ? { ...doc, favorites: doc.favorites.filter((f) => f.toolId !== toolId) } : doc;
}
