import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import {
  AdminJwtGuard,
  CsrfGuard,
  PermissionsGuard,
  ScopedThrottlerGuard,
} from './common/guards/index.js';
import { createLoggerOptions } from './common/logging/logger.config.js';
import { AppConfigModule } from './config/config.module.js';
import { AppConfigService } from './config/configuration.js';
import { MailModule } from './mail/mail.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './storage/storage.module.js';

import { AdminUsersModule } from './modules/admin-users/admin-users.module.js';
import { ArticlesModule } from './modules/articles/articles.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CaseStudiesModule } from './modules/case-studies/case-studies.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { EnquiriesModule } from './modules/enquiries/enquiries.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { NewsletterModule } from './modules/newsletter/newsletter.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { ServicesModule } from './modules/services/services.module.js';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module.js';

/**
 * Application composition.
 *
 * The guard order below is the security posture of the whole API and is
 * deliberate:
 *
 *   1. AdminJwtGuard          — authentication, applied to every route unless
 *                               the handler carries `@Public()`. Opt-out, so a
 *                               forgotten decorator fails closed.
 *   2. ScopedThrottlerGuard   — rate limiting. It runs after authentication so
 *                               it can track an authenticated caller by user id
 *                               rather than by a shared office IP.
 *   3. CsrfGuard              — double-submit check for cookie-authenticated
 *                               writes.
 *   4. PermissionsGuard       — authorisation against the permissions a handler
 *                               declares.
 */
@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) =>
        createLoggerOptions({
          level: config.logLevel,
          pretty: !config.isProduction && !config.isTest,
          isTest: config.isTest,
        }),
    }),
    /**
     * Exactly ONE throttler is configured, deliberately.
     *
     * Every throttler in this array is evaluated on every route — a named
     * bucket is not opt-in, it is simply a second limit with its own counter.
     * Registering a strict `enquiry` bucket alongside the default therefore
     * applies that strict limit to the whole API, which is emphatically not
     * what it looks like it does.
     *
     * Routes that need a tighter limit override this one bucket with
     * `@Throttle({ default: { limit, ttl } })`, which changes the ceiling for
     * that handler only.
     */
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.rateLimit.ttlSeconds * 1000,
            limit: config.rateLimit.limit,
          },
        ],
      }),
    }),

    PrismaModule,
    AuditModule,
    MailModule,
    StorageModule,
    PaymentsModule,
    AuthModule,

    HealthModule,
    SiteSettingsModule,
    ServicesModule,
    ArticlesModule,
    CaseStudiesModule,
    ProductsModule,
    PagesModule,
    MediaModule,
    EnquiriesModule,
    NewsletterModule,
    OrdersModule,
    AdminUsersModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: AdminJwtGuard },
    { provide: APP_GUARD, useClass: ScopedThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
