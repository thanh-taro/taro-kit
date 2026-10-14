// MOD-DesignSystem island: CMP-FavoriteToggle, pin or unpin one tool (F-005.R1, F-005.R3).
// - A toggle button: aria-pressed, and a label that states the current state (COPY-fav.add / COPY-fav.remove).
// - Toggles at once, with no confirmation; every toggle and list on the page follows through the shared
//   MOD-PersonalData signals (F-005.R1).
// - Refused (RULE-02): a 25th visible favorite is not pinned and COPY-fav.full is shown beside the button,
//   announced politely and tied to the button with aria-describedby, until focus leaves it or Esc.
// - 44 px target (NFR-09). Before hydration it renders off and disabled, like the other device-data islands.
// Labels arrive as build-time props (`favoriteToggleText()`), so the island ships no copy catalog. The star
// icon is the children: Astro passes it as static slot HTML, so it is not repeated in the island props.
import type { ComponentChildren } from 'preact';
import { effect } from '@preact/signals';
import { useEffect, useId, useState } from 'preact/hooks';
import { visibleToolIds } from 'virtual:tarokit/visible-tool-ids';
import { personalData } from '../personal-data/index.ts';
import { useHydrated } from '../shell/hydrated.ts';

/** Build-time strings for the toggle (see `favoriteToggleText()`). */
export interface FavoriteToggleLabels {
  /** COPY-fav.add: the label while the tool is not a favorite. */
  add: string;
  /** COPY-fav.remove: the label while it is. */
  remove: string;
  /** COPY-fav.full with {limit} from RULE-02: the refused message. */
  full: string;
}

export interface FavoriteToggleProps {
  /** The tool's catalog id (INV-01). */
  toolId: string;
  labels: FavoriteToggleLabels;
  /**
   * `plain`: borderless, for cards (CMP-ToolCard). `framed`: on a surface with a hairline border, for the
   * tool header (CMP-ToolHeader) and standalone use. Default `plain`.
   */
  appearance?: 'plain' | 'framed';
  /** Star size: `md` (20 px, default) or `sm` (16 px, compact cards). The target stays 44 px. */
  size?: 'sm' | 'md';
  /** The star icon markup (an inline SVG from the icon set); filled by CSS while pressed. */
  children?: ComponentChildren;
}

export default function FavoriteToggle({
  toolId,
  labels,
  appearance = 'plain',
  size = 'md',
  children,
}: FavoriteToggleProps) {
  const hydrated = useHydrated();
  const [pressed, setPressed] = useState(false);
  const [refused, setRefused] = useState(false);
  const [justPinned, setJustPinned] = useState(false);
  const messageId = useId();

  // Follows the shared store, so a change made anywhere shows here at once (F-005.R1).
  useEffect(() => effect(() => setPressed(personalData().isFavorite(toolId))), [toolId]);

  const onClick = () => {
    const store = personalData();
    if (store.isFavorite(toolId)) {
      store.unpin(toolId);
      setJustPinned(false);
      return;
    }
    const result = store.pin(toolId, visibleToolIds);
    setRefused(result === 'full');
    setJustPinned(result === 'ok');
  };

  return (
    <span class="tk-fav" data-appearance={appearance} data-size={size} data-refused={refused ? '' : undefined}>
      <button
        type="button"
        class="tk-fav__btn"
        aria-pressed={pressed ? 'true' : 'false'}
        aria-label={pressed ? labels.remove : labels.add}
        aria-describedby={refused ? messageId : undefined}
        data-pop={justPinned && pressed ? '' : undefined}
        disabled={!hydrated}
        onClick={onClick}
        onBlur={() => setRefused(false)}
        onKeyDown={(e) => e.key === 'Escape' && setRefused(false)}
      >
        {children}
      </button>
      {/* Always in the page, so the refused message is announced when it is filled in. */}
      <span id={messageId} class="tk-fav__full" role="status">
        {refused ? labels.full : null}
      </span>
    </span>
  );
}
