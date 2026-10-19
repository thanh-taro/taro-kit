// MOD-DesignSystem codegen (ADR-0003, adapters/design.md): DTCG tokens.json -> tokens.css + tokens.ts.
// Style Dictionary resolves and transforms the tokens; this file only decides where each one goes:
// the dark theme on :root, the light theme under [data-theme="light"], everything else theme-free.
import StyleDictionary from 'style-dictionary';

export const BANNER = 'Generated from specs/30-experience/tokens.json by scripts/gen.ts. Do not edit.';

type Theme = 'dark' | 'light';
export interface FlatToken {
  /** CSS custom property name without theme, e.g. --tk-color-bg */
  cssVar: string;
  value: string;
  theme?: Theme;
}

/** Which theme a token path belongs to: color.<theme>.* and shadow.*.<theme>. */
function themeOf(path: string[]): Theme | undefined {
  if (path[0] === 'color' && (path[1] === 'dark' || path[1] === 'light')) return path[1];
  const last = path[path.length - 1];
  if (path[0] === 'shadow' && (last === 'dark' || last === 'light')) return last;
  return undefined;
}

function stripTheme(name: string, theme: Theme | undefined): string {
  if (!theme) return name;
  return name.replace(new RegExp(`^tk-color-${theme}-`), 'tk-color-').replace(new RegExp(`-${theme}$`), '');
}

export async function flattenTokens(tokensJson: Record<string, unknown>): Promise<FlatToken[]> {
  // `contrast` is a check list for tools/token_contrast.py, not a design value.
  const { contrast: _contrast, $description: _d, ...tokens } = tokensJson;
  const sd = new StyleDictionary({
    tokens: tokens as never,
    log: { verbosity: 'silent', warnings: 'disabled' },
    platforms: {
      css: { prefix: 'tk', transforms: ['name/kebab', 'fontFamily/css', 'cubicBezier/css', 'shadow/css/shorthand'] },
    },
  });
  const { allTokens } = await sd.getPlatformTokens('css');
  return allTokens.map((t) => {
    const theme = themeOf(t.path);
    return { cssVar: `--${stripTheme(t.name, theme)}`, value: String(t.$value ?? t.value), theme };
  });
}

/** The browser's default text size, the rem base. */
export const REM_BASE_PX = 16;

/**
 * Type sizes go to CSS in rem (px / 16), so they follow the browser's text size setting and render the same at
 * the default 16 px (NFR-07, QA a11y m6). tokens.json and tokens.ts keep px; every other dimension stays px.
 */
export function cssValue(t: FlatToken): string {
  const px = /^(\d+(?:\.\d+)?)px$/.exec(t.value);
  if (!px || !t.cssVar.startsWith('--tk-font-size-')) return t.value;
  return `${Number(px[1]) / REM_BASE_PX}rem`;
}

const decls = (list: FlatToken[], indent: string) =>
  list.map((t) => `${indent}${t.cssVar}: ${cssValue(t)};`).join('\n');

export function renderTokensCss(flat: FlatToken[]): string {
  const base = flat.filter((t) => !t.theme);
  const dark = flat.filter((t) => t.theme === 'dark');
  const light = flat.filter((t) => t.theme === 'light');
  checkThemesMatch(dark, light);
  return `/* ${BANNER} */
@layer tokens {
  :root {
    color-scheme: dark;
${decls(base, '    ')}
${decls(dark, '    ')}
  }

  [data-theme='light'] {
    color-scheme: light;
${decls(light, '    ')}
  }

  /* No script ran (MOD-Theme sets data-theme before first paint): follow the device setting. */
  @media (prefers-color-scheme: light) {
    :root:not([data-theme]) {
      color-scheme: light;
${decls(light, '      ')}
    }
  }
}
`;
}

export function renderTokensTs(flat: FlatToken[]): string {
  const pick = (theme?: Theme) =>
    Object.fromEntries(flat.filter((t) => t.theme === theme).map((t) => [t.cssVar.replace(/^--tk-/, ''), t.value]));
  const data = { base: pick(undefined), dark: pick('dark'), light: pick('light') };
  return `/* ${BANNER} */
export const tokens = ${JSON.stringify(data, null, 2)} as const;

export type TokenName = keyof typeof tokens.base | keyof typeof tokens.dark;

/** \`var(--tk-<name>)\` for a token name, for the rare script that needs one. */
export const cssVar = (name: TokenName): string => \`var(--tk-\${name})\`;
`;
}

/** Both themes must define exactly the same roles, or one theme silently falls back to the other. */
export function checkThemesMatch(dark: FlatToken[], light: FlatToken[]): void {
  const a = new Set(dark.map((t) => t.cssVar));
  const b = new Set(light.map((t) => t.cssVar));
  const missing = [...a].filter((n) => !b.has(n)).map((n) => `${n} (light)`);
  missing.push(...[...b].filter((n) => !a.has(n)).map((n) => `${n} (dark)`));
  if (missing.length) throw new Error(`tokens.json: themes differ, missing ${missing.join(', ')}`);
}
