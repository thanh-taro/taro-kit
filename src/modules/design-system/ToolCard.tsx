// MOD-DesignSystem: CMP-ToolCard, the single source of its markup (class contract in styles/tool-card.css).
// Islands that list tools from device data (home favorites and recents, F-007; search results, F-002) use it
// directly; static pages use ToolCard.astro, which renders it without hydration around a FavoriteToggle island.
// - One stretched link whose name is the tool name; the favorite toggle is a separate button above it,
//   so it never opens the tool (CMP-ToolCard behavior).
// - Home's before-first-paint placeholders (src/modules/pages/home/inline.ts) copy the compact markup (card, head,
//   icon, text, link, unavailable note) to take the same space: keep them in step when it changes.
// - Variants: regular (icon, name, summary, category label, linked marker) and compact (icon, name,
//   toggle); `unavailable` dims either one and adds COPY-tool.unavailable (F-011.R3). Islands pass it from
//   MOD-Offline's `online` signal. Static cards (`liveAvailability`, ToolCard.astro) can't know at build: a card
//   whose tool needs the internet carries the note hidden, and tool-card-availability.ts switches the state live.
// - Linked tools: the marker (COPY-tool.opensNewTab) is visible on regular cards and screen-reader text on
//   compact ones; both describe the link (aria-describedby). The link carries `data-tk-visit` so following it
//   records the visit (F-006.R1, MOD-ToolHost visits.ts); the card itself holds no state.
// - Every text is in both languages (<L>, F-019.R4); the tool's name is one text (INV-09).
import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { L } from '../language/L.tsx';
import type { Loc, Text } from '../language/languages.ts';
import FavoriteToggle, { type FavoriteToggleLabels } from './FavoriteToggle.tsx';
import {
  describedBy,
  monogram,
  needsInternet,
  toolCardLink,
  type ToolCardTool,
  type ToolCardVariant,
} from './tool-card.ts';

export type { ToolCardTool, ToolCardVariant };

/** Build-time strings and icons, from `toolCardText()` (text.ts); pass the same object to every card. */
export interface ToolCardText {
  favorite: FavoriteToggleLabels;
  /** COPY-tool.opensNewTab */
  opensNewTab: Loc;
  /** COPY-tool.unavailable */
  unavailable: Loc;
  /** Inline SVG markup from the icon set: star 20 px, star 16 px, new tab and offline at 16 px. */
  icons: { star: string; starSmall: string; newTab: string; offline: string };
}

export interface ToolCardProps {
  tool: ToolCardTool;
  /** `regular` (catalog, category pages) or `compact` (home favorites and recents). Default `regular`. */
  variant?: ToolCardVariant;
  /** The category's name, shown as a label on regular cards (F-002.R2). */
  categoryName?: Text;
  /** Offline, and the tool is linked or not offline-capable: dimmed, with COPY-tool.unavailable (F-011.R3). */
  unavailable?: boolean;
  /**
   * Static cards only (ToolCard.astro): when the tool needs the internet, render the unavailable note hidden and
   * mark the card `data-tk-needs-internet` with the note's id, for tool-card-availability.ts to switch offline.
   */
  liveAvailability?: boolean;
  /** A bundled icon's address; without it the card shows the tool's monogram (style.md). */
  iconSrc?: string;
  text: ToolCardText;
  /**
   * The favorite toggle. ToolCard.astro passes the FavoriteToggle island here (so only the toggle hydrates);
   * inside an island leave it out and the card renders its own FavoriteToggle from `text`.
   */
  children?: ComponentChildren;
}

// Build-time SVG strings from the icon set (DEP-15), never user or runtime data.
const Svg = ({ markup, class: cls }: { markup: string; class?: string }) => (
  <span class={cls} aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
);

export default function ToolCard({
  tool,
  variant = 'regular',
  categoryName,
  unavailable = false,
  liveAvailability = false,
  iconSrc,
  text,
  children,
}: ToolCardProps) {
  const uid = useId();
  const { href, newTab } = toolCardLink(tool);
  const regular = variant === 'regular';
  const newTabId = newTab ? `${uid}-newtab` : undefined;
  const live = liveAvailability && !unavailable && needsInternet(tool);
  const noteId = unavailable || live ? `${uid}-unavailable` : undefined;
  // The note describes the link only while it is shown.
  const unavailableId = unavailable ? noteId : undefined;
  return (
    <div
      class="tk-toolcard"
      data-variant={variant}
      data-unavailable={unavailable ? '' : undefined}
      data-tk-needs-internet={live ? noteId : undefined}
    >
      <div class="tk-toolcard__head">
        <span class="tk-toolcard__icon" aria-hidden="true">
          {iconSrc ? <img src={iconSrc} alt="" /> : monogram(tool.name)}
        </span>
        <div class="tk-toolcard__text">
          <a
            class="tk-toolcard__link"
            href={href}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noopener noreferrer' : undefined}
            // F-006.R1: following a linked tool's link records a visit (MOD-ToolHost's listener reads this mark).
            data-tk-visit={newTab ? tool.id : undefined}
            aria-describedby={describedBy(newTabId, unavailableId)}
          >
            {tool.name}
          </a>
          {regular && (
            <p class="tk-toolcard__summary">
              <L text={tool.summary} />
            </p>
          )}
        </div>
      </div>
      {regular && (categoryName || newTab) && (
        <div class="tk-toolcard__meta">
          {categoryName && (
            <span class="tk-toolcard__category">
              <L text={categoryName} />
            </span>
          )}
          {newTab && (
            <span id={newTabId} class="tk-toolcard__newtab">
              <L text={text.opensNewTab} />
              <Svg markup={text.icons.newTab} />
            </span>
          )}
        </div>
      )}
      {!regular && newTab && (
        <span id={newTabId} class="tk-visually-hidden">
          <L text={text.opensNewTab} />
        </span>
      )}
      {(unavailable || live) && (
        <span id={noteId} class="tk-toolcard__unavailable" hidden={live}>
          <Svg markup={text.icons.offline} />
          <L text={text.unavailable} />
        </span>
      )}
      <span class="tk-toolcard__fav">
        {children ?? (
          <FavoriteToggle toolId={tool.id} labels={text.favorite} size={regular ? 'md' : 'sm'}>
            <Svg markup={regular ? text.icons.star : text.icons.starSmall} />
          </FavoriteToggle>
        )}
      </span>
    </div>
  );
}
