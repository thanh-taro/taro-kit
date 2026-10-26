// Static checks (ADR-0006): typescript-eslint, astro and jsx-a11y, plus the local literal-text rule (ADR-0012).
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import tk from './eslint-rules/no-literal-text.js';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'dist-fixtures/',
      'dist-samples/',
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
    // ADR-0012: no literal user-facing text in components (strings come from MOD-Copy in both languages).
    files: ['src/**/*.tsx', 'src/**/*.astro'],
    plugins: { tk },
    // Allowed: glyphs that are the same in every language (the Esc key cap, the logo's "T" mark).
    rules: { 'tk/no-literal-text': ['error', { allow: ['Esc', 'T'] }] },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
