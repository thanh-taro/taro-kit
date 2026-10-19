// MOD-Pages island: SCR-Home's personal regions, from device data. Design: HomeDesktop / HomeMobile (favorites,
// recents) and HomeStatesDesktop / HomeStatesMobile (first visit, storage unavailable, offline).
// Implements: F-007.R3 (favorites, then recents per RULE-01, each only when it has items), F-007.R6 (with neither,
// the first-visit invitation: with the shortcut on devices with a keyboard, the touch text on touch-only devices).
// - Favorites (region 4, COPY-home.favorites): MOD-PersonalData's visible favorites in pin order as compact
//   CMP-ToolCards, with their count beside the heading (design). Recents (region 5): RecentTools (F-006).
// - The invitation is CMP-StateMessage with COPY-home.firstVisit (its {shortcut} as a key cap) or
//   COPY-home.firstVisitTouch, and the browse action (COPY-notFound.toCatalog → the catalog).
// - Until the device data is read (the build, and the first render in the browser) it renders both invitations,
//   marked `data-pending`, and CSS shows the one the reserve script chose (inline.ts), or the keyboard one when
//   scripts don't run; in the default state the reserve script's placeholders hold the sections' place. Once
//   ready it renders the real state and `data-tk-home-ready`, which removes the placeholders (index.astro CSS).
// - Reactive: pins, unpins, visits and clears from any island or window update it at once (F-005.R1); offline,
//   tools that need the internet are marked unavailable (F-011.R3).
import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import StateMessage from '../../design-system/StateMessage.tsx';
import ToolCard, { type ToolCardText, type ToolCardTool } from '../../design-system/ToolCard.tsx';
import { needsInternet } from '../../design-system/tool-card.ts';
import { online } from '../../offline/index.ts';
import { isApplePlatform, SHORTCUT_LABELS } from '../../palette/logic.ts';
import { personalData, type Favorite, type RecentVisit } from '../../personal-data/index.ts';
import './home.css';
import RecentTools from './RecentTools.tsx';

/** Touch-only per platform-mapping (F-007.R6); anything else has a keyboard. */
export const TOUCH_ONLY_QUERY = '(any-hover: none) and (any-pointer: coarse)';

export interface HomePersonalText {
  /** COPY-home.favorites */
  favorites: string;
  /** COPY-home.recents */
  recents: string;
  /** COPY-home.firstVisit around {shortcut}, and COPY-home.firstVisitTouch. */
  invite: { keyboard: { before: string; after: string }; touch: string };
  /** COPY-notFound.toCatalog and the catalog's address. */
  browse: { label: string; href: string };
  /** The invitation's icon (build-time SVG). */
  inviteIcon: string;
  cards: ToolCardText;
}

export interface HomePersonalProps {
  /** The visible tools; their ids are the visible ids (RULE-06). */
  tools: ToolCardTool[];
  text: HomePersonalText;
}

// In the browser, the palette bootstrap has already written this platform's label into the key cap
// (`data-tk-shortcut`), so the first render must agree with it; the build has no platform and uses the default.
const shortcutLabel = () =>
  typeof document === 'undefined'
    ? SHORTCUT_LABELS.other
    : SHORTCUT_LABELS[isApplePlatform(navigator) ? 'apple' : 'other'];

function Invitation({ text, touch, pending }: { text: HomePersonalText; touch: boolean; pending?: boolean }) {
  const title = touch ? (
    text.invite.touch
  ) : (
    <>
      {text.invite.keyboard.before}
      <kbd data-tk-shortcut>{shortcutLabel()}</kbd>
      {text.invite.keyboard.after}
    </>
  );
  return (
    <div class="tk-home-invite" data-pending={pending ? (touch ? 'touch' : 'keyboard') : undefined}>
      <StateMessage variant="empty" iconSvg={text.inviteIcon} title={title} action={text.browse} />
    </div>
  );
}

export default function HomePersonal({ tools, text }: HomePersonalProps) {
  const headingId = useId();
  const byId = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [recents, setRecents] = useState<RecentVisit[] | null>(null);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(matchMedia(TOUCH_ONLY_QUERY).matches);
    const store = personalData();
    const ids = [...byId.keys()];
    const stopFavorites = store.visibleFavorites(ids).subscribe(setFavorites);
    const stopRecents = store.visibleRecents(ids).subscribe(setRecents);
    return () => {
      stopFavorites();
      stopRecents();
    };
  }, [byId]);

  // One fixed structure in every state, so RecentTools stays mounted from hydration on: its data arrives in the
  // same render as this island's, and the placeholders never leave before the recents are shown.
  const pending = !favorites || !recents;
  const shown = pending ? [] : favorites.flatMap((f) => byId.get(f.toolId) ?? []);
  const empty = !pending && shown.length === 0 && recents.length === 0;
  return (
    <>
      {pending ? (
        <>
          <Invitation text={text} touch={false} pending />
          <Invitation text={text} touch pending />
        </>
      ) : empty ? (
        <Invitation text={text} touch={touch} />
      ) : null}
      {shown.length > 0 ? (
        <section class="tk-favorites" aria-labelledby={headingId}>
          <div class="tk-favorites__head">
            <h2 id={headingId} class="tk-favorites__heading">
              {text.favorites}
            </h2>
            {/* Visual only: the list itself tells assistive technology how many there are. */}
            <span class="tk-favorites__count" aria-hidden="true">
              {shown.length}
            </span>
          </div>
          <ul class="tk-favorites__list">
            {shown.map((tool) => (
              <li key={tool.id}>
                <ToolCard
                  tool={tool}
                  variant="compact"
                  unavailable={!online.value && needsInternet(tool)}
                  text={text.cards}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <RecentTools tools={tools} text={text.cards} heading={text.recents} />
      {pending ? null : <span data-tk-home-ready hidden />}
    </>
  );
}
