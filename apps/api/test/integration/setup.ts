import { execSync } from 'node:child_process';
import process from 'node:process';
import { beforeAll } from 'vitest';

/**
 * Integration-test bootstrap.
 *
 * Points the whole process at TEST_DATABASE_URL and applies migrations before
 * any test runs, so the suite exercises the real schema — including the
 * constraints and indexes that only exist in migration SQL.
 *
 * The guard below matters: these tests TRUNCATE every table between cases, so
 * running them against a development or production URL would destroy data. The
 * check refuses anything that is not plainly a test database.
 */
// The documented developer flow is "copy .env.example to .env", so honour it
// here too rather than requiring the variables to be exported by hand. Values
// already in the environment win, which is how CI overrides them.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // No .env file; the environment is expected to carry the variables.
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Start the test database with `docker compose --profile test up -d postgres-test` and copy .env.example to .env.',
  );
}

if (!/test/i.test(testDatabaseUrl)) {
  throw new Error(
    `Refusing to run integration tests against "${testDatabaseUrl.replace(/:\/\/[^@]+@/, '://***@')}": ` +
      'the database name must contain "test". These tests truncate every table.',
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';

// Deterministic, obviously-fake secrets. Long enough to satisfy validation and
// recognisable in a log as test-only values.
process.env.JWT_ACCESS_SECRET ||= 'integration-test-access-secret-value-0123456789';
process.env.JWT_REFRESH_SECRET ||= 'integration-test-refresh-secret-value-9876543210';
process.env.CSRF_SECRET ||= 'integration-test-csrf-secret-value-abcdefghijklmno';
process.env.DOWNLOAD_LINK_SECRET ||= 'integration-test-download-secret-value-pqrstuvwxyz';
process.env.CORS_ORIGINS ||= 'http://localhost:3000';
process.env.EMAIL_PROVIDER = 'console';
process.env.COMMERCE_ENABLED = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.SWAGGER_ENABLED = 'false';

beforeAll(() => {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: new URL('../..', import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });
}, 120_000);
