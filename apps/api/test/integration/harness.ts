import { HttpAdapterHost } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';

import { AppModule } from '../../src/app.module.js';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter.js';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createValidationPipe } from '../../src/common/pipes/validation.pipe.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PasswordService } from '../../src/modules/auth/password.service.js';
import type { AdminRole } from '@inkvision/shared-types';

export interface TestHarness {
  readonly app: NestExpressApplication;
  readonly prisma: PrismaService;
  readonly moduleRef: TestingModule;
}

/**
 * Boots the real application against the test database.
 *
 * Nothing is mocked except, by default, the rate limiter: the same guards,
 * pipes, filter and Prisma client run as in production. That is the point —
 * these tests exist to catch what a mocked database cannot show, such as a
 * unique constraint or a guard applied in the wrong order.
 *
 * Rate limiting is disabled by default because a suite that submits a dozen
 * enquiries in a second is not the traffic it exists to stop, and leaving it on
 * would make every other assertion flaky. `rateLimiting: true` boots with it
 * active; `rate-limiting.spec.ts` uses that to test the limiter itself.
 */
export async function createTestHarness(
  options: { rateLimiting?: boolean } = {},
): Promise<TestHarness> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (!options.rateLimiting) {
    // The guard is registered through APP_GUARD, which `overrideGuard` does
    // not reach. Replacing its storage with one that never records a hit
    // neutralises it while leaving the guard itself in the chain — so guard
    // ordering, which matters, is still the real thing.
    builder.overrideProvider(ThrottlerStorage).useValue({
      increment: async () => ({
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    });
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();

  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: [{ path: '', method: 0 }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  await app.init();

  return { app, prisma: app.get(PrismaService), moduleRef };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.truncateAllTables();
}

/** Creates an administrator with a known password, for sign-in tests. */
export async function createAdminUser(
  harness: TestHarness,
  options: { email?: string; password?: string; role?: AdminRole } = {},
): Promise<{ id: string; email: string; password: string }> {
  const email = options.email ?? 'owner@test.local';
  const password = options.password ?? 'integration-test-password-123';
  const passwords = harness.moduleRef.get(PasswordService);

  const user = await harness.prisma.adminUser.create({
    data: {
      email,
      fullName: 'Test Owner',
      role: options.role ?? 'OWNER',
      passwordHash: await passwords.hash(password),
      isActive: true,
    },
  });

  return { id: user.id, email, password };
}

/** Minimal site settings, required by any endpoint that reads them. */
export async function seedSiteSettings(prisma: PrismaService): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      supportingStatement: 'Test supporting statement.',
      defaultSeoTitle: 'Test',
      defaultSeoDescription: 'Test description.',
    },
    update: {},
  });
}

export const API = '/api/v1';
