import process from 'node:process';

import { defineConfig, env } from '@prisma/config';

/**
 * Prisma 7 moved the datasource connection URL out of `schema.prisma` and into
 * this file. The schema stays declarative; connection details stay in the
 * environment.
 *
 * `DATABASE_URL` is read here for CLI commands (migrate, studio, db execute).
 * The running application passes its own connection through a driver adapter
 * (see `src/prisma/prisma.service.ts`), so the app and the CLI share one source
 * of truth without the client reaching for process.env on its own.
 *
 * Prisma 7 no longer reads `.env` by itself, so this file does it — values
 * already in the environment win, which is how CI and production override it.
 */
try {
  process.loadEnvFile(new URL('.env', import.meta.url));
} catch {
  // No .env file; the variables are expected to come from the environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
