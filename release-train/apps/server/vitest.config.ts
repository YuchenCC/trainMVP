import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'clover'],
      reportsDirectory: 'coverage',
      exclude: [
        'src/__tests__/**',
        'src/_temp_modules/**',
        'src/prisma/**',
        'src/main.ts',
      ],
    },
  },
});
