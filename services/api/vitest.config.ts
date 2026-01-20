import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Global test setup
        globals: true,

        // Coverage settings
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/index.ts', // Entry point, tested via integration
                'node_modules/**',
                'dist/**',
            ],
        },

        // Test file patterns
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['node_modules', 'dist'],

        // Test timeout
        testTimeout: 10000,
    },
});
