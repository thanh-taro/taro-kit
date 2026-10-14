// MOD-Pages island part: the recents region of SCR-Home (region 5, COPY-home.recents), reusable by F-007's home.
// Implements: F-006.R5 and RULE-01 on screen (via MOD-PersonalData `visibleRecents`): newest first, at most 8,
// favorites left out, unknown or hidden tools never shown (INV-04); F-007.R3's "shown only when it has items".
// - `tools` are the visible tools (MOD-Content `visibleTools`, build-time props): they are both the card data and
//   the visible ids, so a tool hidden in a later build simply drops out while its visit stays stored.
// - Each entry is a compact CMP-ToolCard; a linked tool's card records its visit when followed (F-006.R1).
// - Before hydration (the build has no device) nothing renders, like the other device-data lists.
// - Reactive: visits, clears, pins and unpins from any island or window update it at once (F-005.R1).
import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import ToolCard, { type ToolCardText, type ToolCardTool } from '../../design-system/ToolCard.tsx';
import { personalData, type RecentVisit } from '../../personal-data/index.ts';
import './recent-tools.css';

export interface RecentToolsProps {
  /** The visible tools; their ids are the visible ids (RULE-06). */
  tools: ToolCardTool[];
  /** `toolCardText()` (MOD-DesignSystem), built once at build time. */
  text: ToolCardText;
  /** COPY-home.recents */
  heading: string;
}

export default function RecentTools({ tools, text, heading }: RecentToolsProps) {
  const headingId = useId();
  const byId = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);
  const [recents, setRecents] = useState<RecentVisit[]>([]);
  useEffect(
    () =>
      personalData()
        .visibleRecents([...byId.keys()])
        .subscribe(setRecents),
    [byId],
  );

  const shown = recents.flatMap((r) => byId.get(r.toolId) ?? []);
  if (shown.length === 0) return null;
  return (
    <section class="tk-recents" aria-labelledby={headingId}>
      <h2 id={headingId} class="tk-recents__heading">
        {heading}
      </h2>
      <ul class="tk-recents__list">
        {shown.map((tool) => (
          <li key={tool.id}>
            <ToolCard tool={tool} variant="compact" text={text} />
          </li>
        ))}
      </ul>
    </section>
  );
}
