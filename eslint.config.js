// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const playwright = require('eslint-plugin-playwright');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // ── Ignore patterns ──────────────────────────────────────────────────────
  {
    ignores: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**'],
  },

  // ── TypeScript base config ────────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Disallow explicit `any` (already suppressed in mantine-helpers React fiber access)
      '@typescript-eslint/no-explicit-any': 'warn',
      // Require awaiting promises — catches missing await on Playwright calls
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefer const where possible
      'prefer-const': 'error',
      // No unused variables (catches leftover locals)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // ── Playwright-specific rules ─────────────────────────────────────────────
  {
    files: ['e2e/**/*.spec.ts', 'e2e/**/*.test.ts'],
    plugins: {
      playwright,
    },
    rules: {
      // Discourage fixed waits — use helpers from wait-helpers.ts instead
      'playwright/no-wait-for-timeout': 'error',
      // Require awaiting all Playwright assertions
      'playwright/no-floating-promises': 'error',
      // Disallow page.pause() left in committed code
      'playwright/no-page-pause': 'error',
      // Require expect calls to have a subject
      'playwright/valid-expect': 'error',
      // Prefer locator assertions over manual boolean checks
      'playwright/prefer-web-first-assertions': 'warn',
      // No skipping tests unconditionally (test.skip() without condition)
      'playwright/no-skipped-test': 'warn',
    },
  },
];
