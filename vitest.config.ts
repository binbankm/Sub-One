import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, './lib/shared')
        }
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.{test,spec}.{js,ts}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/test/verify_converter.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'test/', '**/*.d.ts', '**/*.config.*', '**/dist/**']
        }
    }
});
