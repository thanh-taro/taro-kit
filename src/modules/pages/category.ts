// MOD-Pages: SCR-Category data, one static page per visible category (F-016). Pure, over normalized entries;
// it reuses MOD-Content's derivations, so hidden tools and empty categories never get a page (RULE-06).
// Implements: F-016.R1, F-016.R2 (count), F-016.R3 (order), F-016.R4 (navigation), F-016.R5 (no page), and the
// home category row (F-007.R7).
import type { Category } from '../../generated/domain.ts';
import { categoryPath, toolsByCategory, visibleCategories } from '../content/derive.ts';
import { tBoth } from '../copy/index.ts';
import type { Loc, Text } from '../language/languages.ts';

type CategoryLike = Pick<Category, 'id' | 'order' | 'tint'> & { name: Text };
interface ToolLike {
  id: string;
  name: string;
  category: string;
  hidden?: boolean;
}

/** A compact CMP-CategoryTile in the category navigation. */
export interface CategoryNavItem {
  id: string;
  /** In both languages (INV-09). */
  name: Text;
  tint: Category['tint'];
  href: string;
  /** COPY-category.toolCount or COPY-category.toolCountOne, in both languages. */
  count: Loc;
}

export interface CategoryPage<C, T> {
  category: C;
  /** `/tools/<category-id>/` (F-016.R1). */
  path: string;
  /** The category's visible tools, alphabetically (F-016.R3). */
  tools: T[];
  /** The number of visible tools, as copy in both languages (F-016.R2). */
  count: Loc;
  /** Every visible category, in display order (F-016.R4); the page's own is marked by id. */
  nav: CategoryNavItem[];
}

/** "{count} tools", or "1 tool" for exactly one (COPY-category.toolCount, COPY-category.toolCountOne). */
export const toolCountText = (count: number): Loc =>
  count === 1 ? tBoth('COPY-category.toolCountOne') : tBoth('COPY-category.toolCount', { count });

/**
 * The visible categories as tiles, in display order, each with its visible tool count: the category navigation
 * (F-016.R4) and home's browse-by-category row (F-007.R7, RULE-14). Categories with no visible tools are left out.
 */
export function categoryRow<C extends CategoryLike>(
  categories: readonly C[],
  tools: readonly ToolLike[],
): CategoryNavItem[] {
  return visibleCategories(categories, tools).map((c) => ({
    id: c.id,
    name: c.name,
    tint: c.tint,
    href: categoryPath(c.id),
    count: toolCountText(toolsByCategory(tools, c.id).length),
  }));
}

/**
 * One page per category with at least one visible tool, in display order. An unknown category or one whose
 * tools are all hidden has no entry, so no page is built and the host serves the not-found page (F-016.R5).
 */
export function categoryPages<C extends CategoryLike, T extends ToolLike>(
  categories: readonly C[],
  tools: readonly T[],
): CategoryPage<C, T>[] {
  const nav = categoryRow(categories, tools);
  return visibleCategories(categories, tools).map((category) => {
    const list = toolsByCategory(tools, category.id);
    return { category, path: categoryPath(category.id), tools: list, count: toolCountText(list.length), nav };
  });
}
