// Static checks (ADR-0006): typescript-eslint, astro and jsx-a11y.
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-fixtures/',
      '.astro/',
      'node_modules/',
      'spikes/',
      '.claude/',
      '.venv/',
      'src/generated/',
      'playwright-report/',
      'test-results/',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
