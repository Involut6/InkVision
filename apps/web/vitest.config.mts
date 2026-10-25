import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.spec.tsx', 'test/**/*.spec.ts'],
    // Playwright specs live in e2e/ and are run by `pnpm test:e2e`.
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
