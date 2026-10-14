// MOD-ToolHost public surface: the tool view (ToolView.astro with the ToolFrame island, F-003), opening tools
// from cards and the palette (openTool), and the theme hand-off to embedded tools (F-012.R5/R6, ADR-0011).
export { openTool, type OpenableTool, type OpenEnvironment } from './open-tool.ts';
export { initialPhase, SLOW_LOAD_MS, type ToolPhase } from './phase.ts';
export {
  assertHandoffTheme,
  connectThemeHandoff,
  embeddedSrc,
  READY_MESSAGE,
  THEME_MESSAGE,
  THEME_PARAM,
  themeMessage,
  type HandoffOptions,
  type HandoffTheme,
  type ThemeMessage,
  type ThemeSource,
} from './theme-handoff.ts';
