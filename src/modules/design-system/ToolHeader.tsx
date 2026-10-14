// MOD-DesignSystem: CMP-ToolHeader, the slim bar above an embedded tool (F-003.R2, F-003.R5). Class contract in
// styles/tool-header.css; design: design/canvas/CMP-ToolHeader.dc.html, ToolDesktop, ToolMobile, ToolStates*.
// - Anatomy: back (COPY-tool.back), tool icon and name (the page heading), favorite toggle, open-in-new-tab
//   (COPY-tool.openNewTab). Open-in-new-tab is always visible, never in a menu; in the slow variant it becomes
//   the primary button and COPY-tool.slow shows inline below the bar (RULE-11).
// - A toolbar role labeled "<tool> tool" (COPY-tool.frameLabel). Every action keeps its text label; below 720 px
//   the labels are visually hidden and the actions become 44 px icon buttons (SCR-ToolView, narrow).
// - The slow hint lives in a polite status that is always in the page, so it is announced when filled.
// - Rendered by the ToolFrame island (embedded tools) and statically by ToolView.astro (linked tools, whose
//   note carries the open link, design LinkedDesktop, so `openHref` is left out there).
import type { ComponentChildren } from 'preact';
import { monogram } from './tool-card.ts';

export interface ToolHeaderText {
  /** COPY-tool.back */
  back: string;
  /** COPY-tool.openNewTab */
  openNewTab: string;
  /** COPY-tool.frameLabel for this tool: the toolbar's label. */
  label: string;
  /** COPY-tool.slow for this tool. */
  slow: string;
  /** Build-time SVG markup from the icon set (DEP-15): back chevron and new-tab arrow. */
  icons: { back: string; newTab: string };
}

export interface ToolHeaderProps {
  /** The tool's name; its icon is the monogram (style.md: ENT-Tool has no icon field yet). */
  name: string;
  /** The tool's own address, as in the catalog: never carries the theme (F-012.R5). */
  openHref?: string;
  /** The slow variant (RULE-11). */
  slow?: boolean;
  text: ToolHeaderText;
  /** The favorite toggle (CMP-FavoriteToggle). */
  children?: ComponentChildren;
}

// Build-time SVG strings from the icon set, never user or runtime data.
const Svg = ({ markup }: { markup: string }) => (
  <span class="tk-toolheader__glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: markup }} />
);

export default function ToolHeader({ name, openHref, slow = false, text, children }: ToolHeaderProps) {
  return (
    <div class="tk-toolheader" role="toolbar" aria-label={text.label} tabindex={-1} data-slow={slow ? '' : undefined}>
      <div class="tk-toolheader__bar">
        {/* The back behavior (history) is a page script; without it, the link goes home. */}
        <a class="tk-toolheader__back" href="/" data-tk-back="">
          <Svg markup={text.icons.back} />
          <span class="tk-toolheader__label">{text.back}</span>
        </a>
        <span class="tk-toolheader__sep" aria-hidden="true" />
        <span class="tk-toolheader__icon" aria-hidden="true">
          {monogram(name)}
        </span>
        <h1 class="tk-toolheader__name">{name}</h1>
        <span class="tk-toolheader__fav">{children}</span>
        {openHref && (
          <a
            class="tk-toolheader__open"
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            data-primary={slow ? '' : undefined}
          >
            <span class="tk-toolheader__label">{text.openNewTab}</span>
            <Svg markup={text.icons.newTab} />
          </a>
        )}
      </div>
      <div class="tk-toolheader__slow" role="status">
        {slow && (
          <>
            <span class="tk-spinner" data-size="sm" aria-hidden="true" />
            <span>{text.slow}</span>
          </>
        )}
      </div>
    </div>
  );
}
