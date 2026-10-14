// MOD-ToolHost public surface. This slice holds only the theme hand-off (F-012.R5/R6, ADR-0011);
// <ToolView>, the ToolFrame island and openTool() arrive with F-003.
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
