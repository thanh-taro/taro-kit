---
id: MOD-DesignSystem
title: Design system
status: draft
depends_on: [MOD-Copy]
---

## Responsibility
MOD-DesignSystem owns the visual foundation and the shared presentational components.
- **Foundation:**
  - generated token CSS from `specs/30-experience/tokens.json` (ADR-0003);
  - the cascade-layer stack, reset and base typography;
  - self-hosted font faces;
  - inline SVG icons;
  - focus-visible styles;
  - reduced-motion handling;
  - the 44 px touch-target rules.
- **Components:** CMP-ToolCard (including its unavailable variant), CMP-ProjectCard, CMP-StateMessage, CMP-FavoriteToggle and CMP-ToolHeader.
- **Rendering:** Astro components for static parts, and Preact versions where an island needs them. Both share the same class contract and CSS.

## Not responsible for
- Page composition (MOD-Pages) and the shell frame (MOD-Shell).
- Data and state. Components get values and callbacks.
- The command palette's behavior (MOD-Palette).

## Public surface
- `tokens.css` and `tokens.ts`.
- The `<Icon name>` component.
- The components listed above, with props that mirror their component specs' anatomy and states.

### Tool card and favorite toggle props (F-005)
In `src/modules/design-system/`. Markup and CSS are shared by the Astro and Preact versions through the class contracts `.tk-toolcard*` (`styles/tool-card.css`) and `.tk-fav*` (`styles/favorite-toggle.css`).
- **`ToolCard.astro`** (static pages: catalog, category pages). Props:
  - `tool`: `{ id, name, summary, openMode, url }` (a `CatalogTool` or `RegTool` fits);
  - `variant`: `regular` (default; icon, name, summary, category label, linked marker) or `compact` (icon, name, toggle);
  - `categoryName`: the category label on regular cards;
  - `unavailable`: dimmed, with COPY-tool.unavailable describing the link (F-011 sets it);
  - `iconSrc`: a bundled icon's address; without it the tool's monogram shows (style.md);
  - `hydrate`: `load`, `idle` (default) or `visible`, for the toggle island.
  The card is one stretched link named by the tool. An embedded tool links to `/t/<id>/` (F-003.R1). A linked tool links to its own address in a new tab (F-003.R4), and COPY-tool.opensNewTab describes the link (`aria-describedby`): visible on regular cards, screen-reader text on compact ones. The toggle sits above the link, so it never opens the tool.
- **`ToolCard.tsx`** (Preact, for islands that list cards from device data, such as home and search results). The single source of the card markup: ToolCard.astro renders it without hydration. Same props without `hydrate`, plus `text`, the build-time `toolCardText()` (`text.ts`) passed once to the island, and optional `children`, the favorite toggle (ToolCard.astro passes the FavoriteToggle island; left out, the card renders its own).
- **`FavoriteToggle.astro`** (the tool header, standalone). Props: `toolId`, `appearance` (`framed`, the default, or `plain`), `size` (`md` or `sm`), `hydrate` (`idle`, the default, `load` or `visible`).
- **`FavoriteToggle.tsx`** (the island). Props: `toolId`; `labels` (`favoriteToggleLabels()`: COPY-fav.add, COPY-fav.remove, COPY-fav.full with the RULE-02 limit); `appearance`; `size`; the star icon as children (`favoriteStar(size)`). It is a 44 px toggle button with `aria-pressed` and a label that states the current state. A refused pin keeps it off and shows COPY-fav.full in a polite status beside it, tied with `aria-describedby`, until focus leaves or Esc. Each refused press empties and refills the status, so it is announced again. Before hydration it renders off and disabled.

### Category tile, state message and category icons (F-016)
- **`CategoryTile.astro`**, compact variant (category navigation). Props: `name`, `href` (`categoryPath(id)`), `count` (COPY-category.toolCount or COPY-category.toolCountOne), `tint`, `iconSvg` and `current`. One link, a pill with the tinted icon and the name; its accessible name is "<name>, <count>" (`aria-label`); `current` adds the tint fill and `aria-current="page"`. The regular variant (home row) is added with F-007.
- **`StateMessage.astro`**. Props: `variant` (`empty`, `no-results`, `offline`, `info`, `not-found`), `title`, `body`, `action` (`{ href, label }`, the primary action), `headingLevel` (the title as a heading, 1 on SCR-NotFound) and `live` (`role="status"`, for messages that appear after load). Extra actions go in the default slot. The `page` variant is added with F-002 and F-003.
- **`styles/category-tint.css`**: an element with `data-tint="<tint>"` gets that tint's pair for the current theme as `--cat-bg` and `--cat-fg` (RULE-14).
- **`svgFromFile(file, size)`** (`icons.ts`): inline SVG for a bundled icon file, such as a category icon in `content/assets/icons/` (DEP-44), normalized like `iconSvg` (1.5 px stroke, currentColor, aria-hidden).

## Implements
The shared parts of F-002.R2, F-005.R1, F-009.R2 and F-011.R3, plus CMP-ToolCard, CMP-ProjectCard, CMP-StateMessage, CMP-FavoriteToggle and CMP-ToolHeader. It is the main owner of NFR-03, NFR-07 and NFR-09.
