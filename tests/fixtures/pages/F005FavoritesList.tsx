// Tests-only island: a stand-in for home's favorites region (SCR-Home region 4, built by F-007), listing
// MOD-PersonalData's visible favorites in pin order as compact CMP-ToolCards.
// `?hide=<id>,<id>` simulates a later build in which those tools are hidden (F-005.AC5): they are taken
// out of the visible ids exactly as the registry would (RULE-06), while storage is left untouched.
import { useEffect, useState } from 'preact/hooks';
import { visibleToolIds } from 'virtual:tarokit/visible-tool-ids';
import ToolCard, { type ToolCardText, type ToolCardTool } from '../../../src/modules/design-system/ToolCard.tsx';
import { personalData, type Favorite } from '../../../src/modules/personal-data/index.ts';

interface Props {
  tools: ToolCardTool[];
  text: ToolCardText;
}

export default function F005FavoritesList({ tools, text }: Props) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  useEffect(() => {
    const hidden = new Set((new URLSearchParams(location.search).get('hide') ?? '').split(',').filter(Boolean));
    const visible = visibleToolIds.filter((id) => !hidden.has(id));
    return personalData().visibleFavorites(visible).subscribe(setFavorites);
  }, []);
  const byId = new Map(tools.map((t) => [t.id, t]));
  return (
    <ul class="fx-favorites" data-testid="favorites">
      {favorites.map((f) => {
        const tool = byId.get(f.toolId);
        return tool ? (
          <li key={f.toolId}>
            <ToolCard tool={tool} variant="compact" text={text} />
          </li>
        ) : null;
      })}
    </ul>
  );
}
