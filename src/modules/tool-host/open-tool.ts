// MOD-ToolHost: opening a tool from a card or the palette (F-003.R1, F-003.R4). Browser-safe and import-light.
// - A linked tool opens its own address in a new tab, with no opener or referrer, and the portal stays put.
// - An embedded tool goes to its stable portal address, /t/<id>/.
// Cards use plain links with the same targets (CMP-ToolCard, toolCardLink); this is for script-driven opens
// such as the palette (F-004). Recording the visit is added by F-006.
import { toolPath } from '../content/derive.ts';

export interface OpenableTool {
  id: string;
  openMode: 'embedded' | 'linked';
  url: string;
}

export interface OpenEnvironment {
  open(url: string, target: string, features: string): unknown;
  assign(path: string): void;
}

const browser = (): OpenEnvironment => ({
  open: (url, target, features) => window.open(url, target, features),
  assign: (path) => window.location.assign(path),
});

export function openTool(tool: OpenableTool, env: OpenEnvironment = browser()): void {
  if (tool.openMode === 'linked') env.open(tool.url, '_blank', 'noopener,noreferrer');
  else env.assign(toolPath(tool.id));
}
