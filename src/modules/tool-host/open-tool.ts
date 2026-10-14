// MOD-ToolHost: opening a tool from a card or the palette (F-003.R1, F-003.R4, F-006.R1). Browser-safe.
// - A linked tool opens its own address in a new tab, with no opener or referrer, and the portal stays put; the
//   visit is recorded (F-006.R1).
// - An embedded tool goes to its stable portal address, /t/<id>/, where the tool view records the visit.
// Cards use plain links with the same targets (CMP-ToolCard, toolCardLink) and the linked-visit listener
// (visits.ts); this is for script-driven opens such as the palette (F-004).
import { toolPath } from '../content/derive.ts';
import { personalData } from '../personal-data/index.ts';

export interface OpenableTool {
  id: string;
  openMode: 'embedded' | 'linked';
  url: string;
}

export interface OpenEnvironment {
  open(url: string, target: string, features: string): unknown;
  assign(path: string): void;
  /** Records a visit (MOD-PersonalData `recordVisit`). */
  record?(toolId: string): void;
}

const browser = (): OpenEnvironment => ({
  open: (url, target, features) => window.open(url, target, features),
  assign: (path) => window.location.assign(path),
  record: (id) => personalData().recordVisit(id),
});

export function openTool(tool: OpenableTool, env: OpenEnvironment = browser()): void {
  if (tool.openMode === 'linked') {
    env.open(tool.url, '_blank', 'noopener,noreferrer');
    env.record?.(tool.id);
  } else env.assign(toolPath(tool.id));
}
