import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 60000,
    sequence: {
      concurrent: false,
    },
    fileParallelism: false,
  },
});
