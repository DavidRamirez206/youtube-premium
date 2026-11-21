import assert from 'node:assert';

import eslintJs from '@eslint/js';
import type { ESLint, Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import prettierConfig from 'eslint-config-prettier/flat';
import regexpPlugin from 'eslint-plugin-regexp';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pkgJson from './package.json' with { type: 'json' };

const defaultSourceType: Linter.SourceType = 'module';
assert(pkgJson.type === defaultSourceType);

const configs = [
  eslintJs.configs.recommended,
  prettierConfig,
  regexpPlugin.configs['flat/recommended'],

  {
    plugins: {
      // Cast needed due to type mismatch even though this is the recommmended way to use the plugin.
      '@stylistic': stylistic as ESLint.Plugin
    },

    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error'
    },

    languageOptions: {
      sourceType: defaultSourceType,
      parserOptions: { ecmaFeatures: { impliedStrict: true } },
      globals: { ...globals.nodeBuiltin }
    },

    rules: {
      'no-var': 'error',
      'no-await-in-loop': 'error',
      'no-implicit-globals': ['error'],
      'no-unused-vars': ['error', { vars: 'local', argsIgnorePattern: '^_' }],
      'no-useless-rename': ['error'],
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-return': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'no-lonely-if': 'error',
      'prefer-object-has-own': 'error',
      'prefer-exponentiation-operator': 'error',
      'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
      'array-callback-return': [
        'error',
        { checkForEach: true, allowVoid: true }
      ],
      'no-constructor-return': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-useless-assignment': 'error',
      'no-shadow-restricted-names': ['error', { reportGlobalThis: true }],
      'no-unassigned-vars': 'error',
      'preserve-caught-error': 'error',

      // @stylistic rules - needed as prettier doesn't handle these
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],

      /* eslint-plugin-regexp */
      'regexp/prefer-character-class': ['error', { minAlternatives: 2 }],
      'regexp/no-empty-alternative': 'error', // Set to warn in recommended config
      'regexp/no-lazy-ends': 'error', // Set to warn in recommended config
      'regexp/no-potentially-useless-backreference': 'error', // Set to warn in recommended config
      'regexp/confusing-quantifier': 'error', // Set to warn in recommended config
      'regexp/no-useless-flag': 'error', // Set to warn in recommended config
      'regexp/optimal-lookaround-quantifier': 'error' // Set to warn in recommended config
    }
  },

  { files: ['src/**/*'], languageOptions: { globals: { ...globals.browser } } },

  // TypeScript files: without a parser ESLint skipped them entirely.
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['**/*.{ts,mts,cts}']
  })),
  {
    files: ['**/*.{ts,mts,cts}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { vars: 'local', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true }
      ],
      // The codebase talks to undocumented YouTube internals.
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },

  {
    // Why doesn't ESLint do this by default is beyond me.
    files: ['**/*.c[jt]s'],
    languageOptions: { sourceType: 'commonjs' }
  },

  {
    // Why doesn't ESLint do this by default is beyond me.
    files: ['**/*.m[jt]s'],
    languageOptions: { sourceType: 'module' }
  },

  {
    // `ignores` field must be in the very bottom config.
    ignores: ['dist/**/*', '**/*-polyfill.*']
  }
] as const satisfies Linter.Config[];

export default defineConfig(configs);
