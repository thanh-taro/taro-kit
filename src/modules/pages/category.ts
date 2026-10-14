// MOD-Pages: SCR-Category data, one static page per visible category (F-016). Pure, over normalized entries;
// it reuses MOD-Content's derivations, so hidden tools and empty categories never get a page (RULE-06).
// Implements: F-016.R1, F-016.R2 (count), F-016.R3 (order), F-016.R4 (navigation), F-016.R5 (no page).
import type { Category } from '../../generated/domain.ts';
import { categoryPath, toolsByCategory, visibleCategories } from '../content/derive.ts';
import { t } from '../copy/index.ts';

type CategoryLike = Pick<Category, 'id' | 'name' | 'order' | 'tint'>;
interface ToolLike {
  id: string;
  name: string;
  category: string;
  hidden?: boolean;
}

/** A compact CMP-CategoryTile in the category navigation. */
export interface CategoryNavItem {
  id: string;
  name: string;
  tint: Category['tint'];
  href: string;
  /** COPY-category.toolCount or COPY-category.toolCountOne. */
  count: string;
}

export interface CategoryPage<C, T> {
  category: C;
  /** `/tools/<category-id>/` (F-016.R1). */
  path: string;
  /** The category's visible tools, alphabetically (F-016.R3). */
  tools: T[];
  /** The number of visible tools, as copy (F-016.R2). */
  count: string;
  /** Every visible category, in display order (F-016.R4); the page's own is marked by id. */
  nav: CategoryNavItem[];
}

/** "{count} tools", or "1 tool" for exactly one (COPY-category.toolCount, COPY-category.toolCountOne). */
export const toolCountText = (count: number): string =>
  count === 1 ? t('COPY-category.toolCountOne') : t('COPY-category.toolCount', { count });

/**
 * One page per category with at least one visible tool, in display order. An unknown category or one whose
 * tools are all hidden has no entry, so no page is built and the host serves the not-found page (F-016.R5).
 */
export function categoryPages<C extends CategoryLike, T extends ToolLike>(
  categories: readonly C[],
  tools: readonly T[],
): CategoryPage<C, T>[] {
  const shown = visibleCategories(categories, tools).map((category) => ({
    category,
    tools: toolsByCategory(tools, category.id),
  }));
  const nav: CategoryNavItem[] = shown.map(({ category: c, tools: list }) => ({
    id: c.id,
    name: c.name,
    tint: c.tint,
    href: categoryPath(c.id),
    count: toolCountText(list.length),
  }));
  return shown.map(({ category, tools: list }) => ({
    category,
    path: categoryPath(category.id),
    tools: list,
    count: toolCountText(list.length),
    nav,
  }));
}
