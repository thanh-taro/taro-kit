// MOD-Pages: SCR-Home data, built at build time from the registry (F-007). Everything the page and its islands
// need that does not depend on the device: the introduction, the card data, the category row, the what's new
// candidates with their dates' text, and the strings split around their placeholders. Build-time only.
// Implements: F-007.R5 (introduction), F-007.R6 (invitation text), F-007.R7 (category row); F-007.R4's data
// (the window itself is applied in the browser, WhatsNew.tsx, RULE-04).
import { join } from 'node:path';
import type { Profile } from '../../../generated/domain.ts';
import { contentDirectory, type Registry } from '../../content/index.ts';
import { t } from '../../copy/index.ts';
import { svgFromFile } from '../../design-system/icons.ts';
import type { ToolCardTool } from '../../design-system/ToolCard.tsx';
import { categoryRow, type CategoryNavItem } from '../category.ts';
import { around, dateText, type Around, type DateText } from '../now/now.ts';
import type { WhatsNewProps, WhatsNewTool } from './WhatsNew.tsx';

const SLOT = '\u0000';

/** COPY-home.intro around the name, so the name can carry its own style (design HomeDesktop). */
export interface HomeIntro {
  before: string;
  name: string;
  after: string;
}

/** F-007.R5: "I'm {nickname}. {headline}", with the full name when there is no nickname. */
export function homeIntro(profile: Pick<Profile, 'name' | 'nickname' | 'headline'>): HomeIntro {
  const text = around(t('COPY-home.intro', { nickname: SLOT, headline: profile.headline }));
  return { before: text.before, name: profile.nickname || profile.name, after: text.after };
}

/** F-007.R6: COPY-home.firstVisit around its {shortcut} (shown as a key cap), and COPY-home.firstVisitTouch. */
export function firstVisitText(): { keyboard: Around; touch: string } {
  return { keyboard: around(t('COPY-home.firstVisit', { shortcut: SLOT })), touch: t('COPY-home.firstVisitTouch') };
}

/** WhatsNew's props from candidate tools: each date's text formatted once, as SCR-Now's changelog items (absolute dates, without the year). */
export function whatsNewProps(tools: readonly WhatsNewTool[]): WhatsNewProps {
  const dates: Record<string, DateText> = {};
  for (const tool of tools) for (const d of [tool.added, tool.updated]) if (d) dates[d] ??= dateText(d, false);
  const label = (id: 'COPY-now.changelogAdded' | 'COPY-now.changelogUpdated') =>
    around(t(id, { tool: SLOT })).before.trim();
  return {
    tools: tools.map(({ id, name, summary, added, updated }) => ({ id, name, summary, added, updated })),
    dates,
    labels: { added: label('COPY-now.changelogAdded'), updated: label('COPY-now.changelogUpdated') },
    heading: t('COPY-home.whatsNew'),
  };
}

export interface HomeCategoryTile extends CategoryNavItem {
  /** Build-time inline SVG of the category icon. */
  iconSvg: string;
}

export interface HomeView {
  intro: HomeIntro;
  /** The visible tools as card data (HomePersonal; also the visible ids). */
  tools: (ToolCardTool & { offline: boolean })[];
  categories: HomeCategoryTile[];
  whatsNew: WhatsNewProps;
}

/** `contentDir` is where the category icons are (default: this build's content folder). */
export function homeView(registry: Registry, contentDir: string = contentDirectory()): HomeView {
  const visible = registry.visibleTools;
  const icons = new Map(registry.categories.map((c) => [c.id, svgFromFile(join(contentDir, 'assets', c.icon))]));
  return {
    intro: homeIntro(registry.profile),
    tools: visible.map(({ id, name, summary, openMode, url, offline }) => ({
      id,
      name,
      summary,
      openMode,
      url,
      offline,
    })),
    categories: categoryRow(registry.categories, visible).map((c) => ({ ...c, iconSvg: icons.get(c.id) ?? '' })),
    whatsNew: whatsNewProps(visible),
  };
}
