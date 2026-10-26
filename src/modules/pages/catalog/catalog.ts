// MOD-Pages: SCR-Catalog's build-time view, the grouped list that is the page's static HTML (F-002.R1 to R3,
// R6). Pure, over normalized entries; it reuses the category pages' derivation, so the groups, their order and
// the category navigation are exactly the category pages' (F-016) and hidden entries never appear (RULE-06).
// Implements: F-002.R1, F-002.R3, F-002.R6.
import type { Category } from '../../../generated/domain.ts';
import { categoryPages, type CategoryNavItem } from '../category.ts';
import type { Text } from '../../language/languages.ts';

type CategoryLike = Pick<Category, 'id' | 'order' | 'tint'> & { name: Text };
interface ToolLike {
  id: string;
  name: string;
  category: string;
  hidden?: boolean;
}

export interface CatalogGroup<C, T> {
  category: C;
  /** The category page's address; the group heading links to it (F-002.R3). */
  path: string;
  /** The category's visible tools, alphabetically (F-002.R1). */
  tools: T[];
}

export interface CatalogView<C, T> {
  /** Visible categories in display order, each with its visible tools (F-002.R1). */
  groups: CatalogGroup<C, T>[];
  /** The category navigation: a compact tile per visible category (F-002.R3). */
  nav: CategoryNavItem[];
  /** The number of visible tools. */
  total: number;
  /** No visible tools: the empty state (F-002.R6). */
  empty: boolean;
}

export function catalogView<C extends CategoryLike, T extends ToolLike>(
  categories: readonly C[],
  tools: readonly T[],
): CatalogView<C, T> {
  const pages = categoryPages(categories, tools);
  const groups = pages.map(({ category, path, tools: list }) => ({ category, path, tools: list }));
  const total = groups.reduce((n, g) => n + g.tools.length, 0);
  return { groups, nav: pages[0]?.nav ?? [], total, empty: total === 0 };
}
