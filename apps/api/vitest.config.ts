import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Two projects, run separately.
 *
 *   * `unit` — fast, no database. Services are constructed directly with test
 *     doubles, so these run anywhere.
 *   * `integration` — against a real PostgreSQL. Prisma's behaviour (unique
 *     constraints, transactions, enum handling) is exactly what these exist to
 *     verify, so mocking the database would defeat the point.
 *
 * The SWC plugin is required because NestJS relies on `emitDecoratorMetadata`,
 * which esbuild — Vitest's default transformer — does not implement.
 */
export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2022',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.spec.ts'],
          setupFiles: ['test/integration/setup.ts'],
          // Integration tests share one database, so they must not interleave.
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/**/*.module.ts', 'src/main.ts'],
    },
  },
});
