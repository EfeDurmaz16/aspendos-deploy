import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        rules: {
            // Allow unused vars with underscore prefix
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // Allow any types (relaxed for now)
            '@typescript-eslint/no-explicit-any': 'warn',
            // React hooks rules
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            // No console in production
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        ignores: [
            '.next/**',
            'node_modules/**',
            'public/**',
            '*.config.js',
            '*.config.mjs',
            '*.config.ts',
            'sw.ts',
            'serwist.config.ts',
        ],
    }
);
