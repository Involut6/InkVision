import { z } from 'zod';

/**
 * Environment contract for the API.
 *
 * Validation runs once at bootstrap. A missing or malformed value aborts
 * startup with a readable report rather than failing later at the first
 * request, which is the behaviour required by the deployment checklist.
 */

const booleanish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0', 'yes', 'no', ''])])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    return value === 'true' || value === '1' || value === 'yes';
  });

const port = z.coerce.number().int().min(1).max(65535);
const seconds = z.coerce.number().int().positive();

/** Comma-separated list → trimmed, non-empty array. */
const csv = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === '' ? undefined : value))
  .pipe(z.string().url().optional());

/** Secrets must be long enough to be worth signing with. */
const secret = (name: string) =>
  z
    .string({ error: `${name} is required` })
    .min(32, `${name} must be at least 32 characters. Generate one with: openssl rand -base64 48`)
    .refine(
      (value) => !/^replace-me/i.test(value),
      `${name} still holds the placeholder from .env.example. Generate a real value.`,
    );

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: port.default(4000),
    API_HOST: z.string().default('0.0.0.0'),
    API_GLOBAL_PREFIX: z.string().default('api'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').startsWith('postgres'),

    CORS_ORIGINS: csv,
    PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
    PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),

    JWT_ACCESS_SECRET: secret('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: secret('JWT_REFRESH_SECRET'),
    JWT_ACCESS_TTL: seconds.default(900),
    JWT_REFRESH_TTL: seconds.default(1_209_600),
    AUTH_COOKIE_DOMAIN: z.string().optional(),
    AUTH_COOKIE_SECURE: booleanish.default(false),
    AUTH_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    CSRF_SECRET: secret('CSRF_SECRET'),

    // The global ceiling, applied to every route.
    RATE_LIMIT_TTL: seconds.default(60),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(120),
    // Tighter ceilings for the two routes worth abusing. Applied per handler;
    // see the note in app.module.ts on why there is only one throttler bucket.
    AUTH_RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(5),
    ENQUIRY_RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(5),

    EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
    EMAIL_FROM: z.string().min(3).default('InkVision Creatives <no-reply@localhost>'),
    EMAIL_NOTIFICATIONS_TO: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: port.optional(),
    SMTP_SECURE: booleanish.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().default('./.local-storage'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: booleanish.default(false),
    UPLOAD_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(10 * 1024 * 1024),

    COMMERCE_ENABLED: booleanish.default(false),
    PAYMENT_PROVIDER: z.enum(['none', 'paystack', 'stripe']).default('none'),
    PAYMENT_CURRENCY: z
      .string()
      .length(3, 'PAYMENT_CURRENCY must be a three-letter ISO-4217 code')
      .default('NGN')
      .transform((value) => value.toUpperCase()),
    PAYSTACK_SECRET_KEY: z.string().optional(),
    PAYSTACK_PUBLIC_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    DOWNLOAD_LINK_SECRET: secret('DOWNLOAD_LINK_SECRET'),
    DOWNLOAD_LINK_TTL: seconds.default(900),
    DOWNLOAD_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),

    SCHEDULING_PROVIDER: z.string().optional(),
    SCHEDULING_EMBED_URL: optionalUrl,
    SWAGGER_ENABLED: booleanish.default(true),
    SWAGGER_USER: z.string().optional(),
    SWAGGER_PASSWORD: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET.',
      });
    }

    if (env.EMAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message: 'SMTP_HOST is required when EMAIL_PROVIDER=smtp.',
      });
    }

    if (env.STORAGE_DRIVER === 's3') {
      for (const key of [
        'S3_BUCKET',
        'S3_REGION',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} is required when STORAGE_DRIVER=s3.`,
          });
        }
      }
    }

    // Commerce may only be switched on once a provider is actually configured;
    // this is the guard that stops a half-configured deployment taking money.
    if (env.COMMERCE_ENABLED) {
      if (env.PAYMENT_PROVIDER === 'none') {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYMENT_PROVIDER'],
          message:
            'COMMERCE_ENABLED=true requires PAYMENT_PROVIDER to be a real provider (paystack or stripe).',
        });
      }
      if (env.PAYMENT_PROVIDER === 'paystack' && !env.PAYSTACK_SECRET_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['PAYSTACK_SECRET_KEY'],
          message: 'PAYSTACK_SECRET_KEY is required when PAYMENT_PROVIDER=paystack.',
        });
      }
      if (env.PAYMENT_PROVIDER === 'stripe') {
        if (!env.STRIPE_SECRET_KEY) {
          ctx.addIssue({
            code: 'custom',
            path: ['STRIPE_SECRET_KEY'],
            message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe.',
          });
        }
        if (!env.STRIPE_WEBHOOK_SECRET) {
          ctx.addIssue({
            code: 'custom',
            path: ['STRIPE_WEBHOOK_SECRET'],
            message:
              'STRIPE_WEBHOOK_SECRET is required when PAYMENT_PROVIDER=stripe: unsigned webhooks are never trusted.',
          });
        }
      }
    }

    if (env.NODE_ENV === 'production') {
      if (!env.AUTH_COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_COOKIE_SECURE'],
          message: 'AUTH_COOKIE_SECURE must be true in production.',
        });
      }
      if (env.AUTH_COOKIE_SAMESITE === 'none' && !env.AUTH_COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_COOKIE_SAMESITE'],
          message: 'AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true.',
        });
      }
      if (env.CORS_ORIGINS.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'CORS_ORIGINS must list at least one allowed origin in production.',
        });
      }
      if (env.SWAGGER_ENABLED && !(env.SWAGGER_USER && env.SWAGGER_PASSWORD)) {
        ctx.addIssue({
          code: 'custom',
          path: ['SWAGGER_ENABLED'],
          message:
            'In production, serving Swagger requires SWAGGER_USER and SWAGGER_PASSWORD, or set SWAGGER_ENABLED=false.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/**
 * Validates `process.env`. Throws a single error listing every problem, so one
 * restart surfaces all misconfiguration instead of one item at a time.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);

  if (!result.success) {
    const report = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid API configuration. Fix the following environment variables (see .env.example):\n${report}`,
    );
  }

  return result.data;
}
