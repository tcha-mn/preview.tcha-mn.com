import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  {
    ignores: ['dist', 'node_modules', '.github', 'types.generated.d.ts', '.astro/**', '**/.astro/**'],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,cjs,mjs,astro}'],
  },
  ...astro.configs['flat/recommended'],
  {
    files: ['**/*.{js,cjs,mjs,ts,astro}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    rules: {
      'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
      'no-unused-vars': ['error', { varsIgnorePattern: '^Props$' }],
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Define the configuration for `<script>` tag.
    // Script in `<script>` is assigned a virtual file name with the `.js` extension.
    files: ['**/*.astro/*.js', '*.astro/*.js'],
    languageOptions: {
      parser: tsParser,
    },
  },
];
