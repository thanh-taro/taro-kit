// MOD-DesignSystem: CMP-ToolCard, Preact version, for islands that list tools from device data
// (home favorites and recents, F-007; search results, F-002). Same markup and class contract as
// ToolCard.astro, which static pages use (styles/tool-card.css).
// - One stretched link whose name is the tool name; the favorite toggle is a separate button above it,
//   so it never opens the tool (CMP-ToolCard behavior).
// - Variants: regular (icon, name, summary, category label, linked marker) and compact (icon, name,
//   toggle); `unavailable` dims either one and adds COPY-tool.unavailable (F-011.R3 drives it).
// - Linked tools: the marker (COPY-tool.opensNewTab) is visible on regular cards and screen-reader text on
//   compact ones; both describe the link (aria-describedby).
import { useId } from 'preact/hooks';
import FavoriteToggle, { type FavoriteToggleLabels } from './FavoriteToggle.tsx';
import { describedBy, monogram, toolCardLink, type ToolCardTool, type ToolCardVariant } from './tool-card.ts';

export type { ToolCardTool, ToolCardVariant };

/** Build-time strings and icons, from `toolCardText()` (text.ts); pass the same object to every card. */
export interface ToolCardText {
  favorite: FavoriteToggleLabels;
  /** COPY-tool.opensNewTab */
  opensNewTab: string;
  /** COPY-tool.unavailable */
  unavailable: string;
  /** Inline SVG markup from the icon set: star 20 px, star 16 px, new tab and offline at 16 px. */
  icons: { star: string; starSmall: string; newTab: string; offline: string };
}

export interface ToolCardProps {
  tool: ToolCardTool;
  /** `regular` (catalog, category pages) or `compact` (home favorites and recents). Default `regular`. */
  variant?: ToolCardVariant;
  /** The category's name, shown as a label on regular cards (F-002.R2). */
  categoryName?: string;
  /** Offline, and the tool is linked or not offline-capable: dimmed, with COPY-tool.unavailable (F-011.R3). */
  unavailable?: boolean;
  /** A bundled icon's address; without it the card shows the tool's monogram (style.md). */
  iconSrc?: string;
  text: ToolCardText;
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
  iconSrc,
  text,
}: ToolCardProps) {
  const uid = useId();
  const { href, newTab } = toolCardLink(tool);
  const regular = variant === 'regular';
  const newTabId = newTab ? `${uid}-newtab` : undefined;
  const unavailableId = unavailable ? `${uid}-unavailable` : undefined;
  return (
    <div class="tk-toolcard" data-variant={variant} data-unavailable={unavailable ? '' : undefined}>
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
            aria-describedby={describedBy(newTabId, unavailableId)}
          >
            {tool.name}
          </a>
          {regular && <p class="tk-toolcard__summary">{tool.summary}</p>}
        </div>
      </div>
      {regular && (categoryName || newTab) && (
        <div class="tk-toolcard__meta">
          {categoryName && <span class="tk-toolcard__category">{categoryName}</span>}
          {newTab && (
            <span id={newTabId} class="tk-toolcard__newtab">
              {text.opensNewTab}
              <Svg markup={text.icons.newTab} />
            </span>
          )}
        </div>
      )}
      {!regular && newTab && (
        <span id={newTabId} class="tk-visually-hidden">
          {text.opensNewTab}
        </span>
      )}
      {unavailable && (
        <span id={unavailableId} class="tk-toolcard__unavailable">
          <Svg markup={text.icons.offline} />
          {text.unavailable}
        </span>
      )}
      <span class="tk-toolcard__fav">
        <FavoriteToggle toolId={tool.id} labels={text.favorite} size={regular ? 'md' : 'sm'}>
          <Svg markup={regular ? text.icons.star : text.icons.starSmall} />
        </FavoriteToggle>
      </span>
    </div>
  );
}
