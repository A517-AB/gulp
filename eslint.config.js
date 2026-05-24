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
    // excluded from tsconfig — Jules example files not part of this project
    'src/electron/jules/advanced-session.ts',
    'src/electron/jules/agent.ts',
    'src/electron/jules/basic-session.ts',
    'src/electron/jules/file-system-events.ts',
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
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/electron/**/*.{ts,mts}', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node,
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
  {
    // shadcn/ui generated files use React.ElementRef which is intentionally deprecated upstream
    files: ['src/renderer/ui/combobox.tsx', 'src/renderer/ui/command.tsx', 'src/renderer/ui/tooltip.tsx', 'src/renderer/ui/popover.tsx'],
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
])
