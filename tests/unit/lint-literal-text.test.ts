// ADR-0012 Consequences: a lint check flags literal text in components (review F-019 m4).
import { ESLint } from 'eslint';
import { describe, expect, test } from 'vitest';

const eslint = new ESLint();
const ruleHits = async (code: string, filePath: string) => {
  const [result] = await eslint.lintText(code, { filePath });
  return result!.messages.filter((m) => m.ruleId === 'tk/no-literal-text').map((m) => m.message);
};

describe('ADR-0012 no literal text in components', () => {
  test('ADR-0012 literal text and literal text attributes in a .tsx component are flagged', async () => {
    const code = `export const A = () => <button aria-label="Close" title={'Open'}>Save</button>;\n`;
    expect(await ruleHits(code, 'src/modules/x/A.tsx')).toHaveLength(3);
  });

  test('ADR-0012 literal text in an .astro template is flagged', async () => {
    const code = `---\n---\n<p>Hello</p>\n<img src="/a.png" alt="A cat" />\n`;
    expect(await ruleHits(code, 'src/modules/x/A.astro')).toHaveLength(2);
  });

  test('ADR-0012 COPY text, punctuation and the allowed glyphs pass', async () => {
    const code = `import { t } from '../copy/index.ts';\nexport const A = () => <p aria-label={t('COPY-shell.skip')}>{t('COPY-shell.skip')} · <kbd>Esc</kbd> <b>T</b> 42</p>;\n`;
    expect(await ruleHits(code, 'src/modules/x/A.tsx')).toEqual([]);
  });
});
