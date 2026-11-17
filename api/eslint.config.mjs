/**
 * Configuração do ESLint (flat config) da API.
 *
 * Base: `@eslint/js` + `typescript-eslint` recomendados, `eslint-config-prettier`
 * por último para desligar regras de formatação — o Prettier é a única fonte de
 * verdade do layout. As regras próprias espelham o juscia-api.
 *
 * @module eslint.config
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.prettierrc.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'import-x/newline-after-import': ['error', { count: 1 }],
      'import-x/no-duplicates': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  prettier
);
