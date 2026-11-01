import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from './env.validation.js';

/**
 * Typed accessor over the validated environment.
 *
 * Every module injects this instead of reading `process.env`, so configuration
 * has exactly one entry point and the compiler catches typos in key names.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.get('API_PORT');
  }

  get host(): string {
    return this.get('API_HOST');
  }

  get globalPrefix(): string {
    return this.get('API_GLOBAL_PREFIX');
  }

  get logLevel(): Env['LOG_LEVEL'] {
    return this.get('LOG_LEVEL');
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  /**
   * True when each request may be served by its own short-lived instance.
   *
   * Vercel sets `VERCEL` itself; `SERVERLESS` covers every other such
   * platform. What it changes: the size of the database connection pool, and
   * which storage drivers are accepted.
   */
  get isServerless(): boolean {
    return this.get('SERVERLESS') || this.get('VERCEL');
  }

  get corsOrigins(): readonly string[] {
    return this.get('CORS_ORIGINS');
  }

  get publicWebUrl(): string {
    return this.get('PUBLIC_WEB_URL').replace(/\/$/, '');
  }

  get publicApiUrl(): string {
    return this.get('PUBLIC_API_URL').replace(/\/$/, '');
  }

  get auth() {
    return {
      accessSecret: this.get('JWT_ACCESS_SECRET'),
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      accessTtlSeconds: this.get('JWT_ACCESS_TTL'),
      refreshTtlSeconds: this.get('JWT_REFRESH_TTL'),
      cookieDomain: this.get('AUTH_COOKIE_DOMAIN') || undefined,
      cookieSecure: this.get('AUTH_COOKIE_SECURE'),
      cookieSameSite: this.get('AUTH_COOKIE_SAMESITE'),
      csrfSecret: this.get('CSRF_SECRET'),
    } as const;
  }

  get rateLimit() {
    return {
      ttlSeconds: this.get('RATE_LIMIT_TTL'),
      limit: this.get('RATE_LIMIT_LIMIT'),
      authLimit: this.get('AUTH_RATE_LIMIT_LIMIT'),
      enquiryLimit: this.get('ENQUIRY_RATE_LIMIT_LIMIT'),
    } as const;
  }

  get mail() {
    return {
      provider: this.get('EMAIL_PROVIDER'),
      from: this.get('EMAIL_FROM'),
      notificationsTo: this.get('EMAIL_NOTIFICATIONS_TO') || undefined,
      smtp: {
        host: this.get('SMTP_HOST'),
        port: this.get('SMTP_PORT'),
        secure: this.get('SMTP_SECURE'),
        user: this.get('SMTP_USER') || undefined,
        password: this.get('SMTP_PASSWORD') || undefined,
      },
    } as const;
  }

  get storage() {
    return {
      driver: this.get('STORAGE_DRIVER'),
      localRoot: this.get('STORAGE_LOCAL_ROOT'),
      maxUploadBytes: this.get('UPLOAD_MAX_BYTES'),
      s3: {
        endpoint: this.get('S3_ENDPOINT') || undefined,
        region: this.get('S3_REGION') || undefined,
        bucket: this.get('S3_BUCKET') || undefined,
        accessKeyId: this.get('S3_ACCESS_KEY_ID') || undefined,
        secretAccessKey: this.get('S3_SECRET_ACCESS_KEY') || undefined,
        forcePathStyle: this.get('S3_FORCE_PATH_STYLE'),
      },
    } as const;
  }

  get commerce() {
    return {
      enabled: this.get('COMMERCE_ENABLED'),
      provider: this.get('PAYMENT_PROVIDER'),
      currency: this.get('PAYMENT_CURRENCY'),
      paystackSecretKey: this.get('PAYSTACK_SECRET_KEY') || undefined,
      stripeSecretKey: this.get('STRIPE_SECRET_KEY') || undefined,
      stripeWebhookSecret: this.get('STRIPE_WEBHOOK_SECRET') || undefined,
      downloadLinkSecret: this.get('DOWNLOAD_LINK_SECRET'),
      downloadLinkTtlSeconds: this.get('DOWNLOAD_LINK_TTL'),
      downloadMaxAttempts: this.get('DOWNLOAD_MAX_ATTEMPTS'),
    } as const;
  }

  get scheduling() {
    const provider = this.get('SCHEDULING_PROVIDER') || undefined;
    const embedUrl = this.get('SCHEDULING_EMBED_URL');
    return {
      provider,
      embedUrl,
      // Booking is only offered when BOTH a provider and its URL are present:
      // a half-configured integration must not surface a dead "book a call".
      enabled: Boolean(provider && embedUrl),
    } as const;
  }

  get swagger() {
    return {
      enabled: this.get('SWAGGER_ENABLED'),
      user: this.get('SWAGGER_USER') || undefined,
      password: this.get('SWAGGER_PASSWORD') || undefined,
    } as const;
  }
}
