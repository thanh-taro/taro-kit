// Tests-only island: hosts the real recents region (MOD-Pages RecentTools, SCR-Home region 5) until F-007 builds
// home. `?hide=<id>,<id>` simulates a later build in which those tools are hidden (F-006.AC8): they are taken out
// of the visible tools exactly as the registry would (RULE-06), while storage is left untouched.
// A `recents-ready` marker appears once it has hydrated, so tests know the list reflects device data.
import { useEffect, useState } from 'preact/hooks';
import type { ToolCardText, ToolCardTool } from '../../../src/modules/design-system/ToolCard.tsx';
import RecentTools from '../../../src/modules/pages/home/RecentTools.tsx';

interface Props {
  tools: ToolCardTool[];
  text: ToolCardText;
  heading: string;
}

export default function F006RecentsHost({ tools, text, heading }: Props) {
  const [visible, setVisible] = useState<ToolCardTool[] | null>(null);
  useEffect(() => {
    const hidden = new Set((new URLSearchParams(location.search).get('hide') ?? '').split(',').filter(Boolean));
    setVisible(tools.filter((t) => !hidden.has(t.id)));
  }, [tools]);
  if (!visible) return null;
  return (
    <div data-testid="recents-host">
      <RecentTools tools={visible} text={text} heading={heading} />
      <span data-testid="recents-ready" hidden />
    </div>
  );
}
