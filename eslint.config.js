import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'references/**',
    'scripts/**',
    'check.ts',
    'scratch/**',
    // excluded from tsconfig — Jules example files not part of this project
    'src/electron/ipc/advanced-workspace.ts',
    'src/electron/ipc/agent.ts',
    'src/electron/ipc/basic-workspace.ts',
    'src/electron/ipc/file-system-events.ts',
  ]),
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
        '@typescript-eslint/restrict-template-expressions': ['error', {allowNumber: true}],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-expect-error': 'allow-with-description',
        minimumDescriptionLength: 10,
      }],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
      files: ['electron/**/*.{ts,mts}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // transport/ is Jules-agnostic — no SDK, no jules references allowed
    files: ['src/renderer/transport/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['*jules*', '*sdk*', '@google/*'],
      }],
    },
  },
  {
    files: ['src/renderer/router.tsx'],
    rules: {
      '@typescript-eslint/only-throw-error': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // shadcn/ui files export variant helpers alongside components — intentional pattern
    files: ['src/renderer/ui/badge.tsx', 'src/renderer/ui/button.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
