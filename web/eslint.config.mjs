/**
 * Configuração do ESLint (flat config) do front.
 *
 * Base: `eslint-config-next` (core web vitals + TypeScript), com
 * `eslint-config-prettier` por último para o Prettier mandar no layout.
 *
 * @module eslint.config
 */
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts', '.prettierrc.js']),
]);

export default eslintConfig;
