// ESLint 10 flat config (replaces .eslintrc.cjs, which ESLint 10 no longer reads).
// Same rules as before: eslint:recommended, typescript-eslint recommended,
// react-hooks recommended, react-refresh only-export-components.
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'coverage', 'backgrounds', 'public'] },
  {
    files: ['**/*.{ts,tsx}'],
    ...js.configs.recommended,
  },
  ...tsPlugin.configs['flat/recommended'].map((c) => ({ ...c, files: ['**/*.{ts,tsx}'] })),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
]
