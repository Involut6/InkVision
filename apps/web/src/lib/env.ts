import { z } from 'zod';

/**
 * Environment contract for the website.
 *
 * Two separate base URLs are deliberate: the Next.js server may reach the API
 * over an internal network address that the browser cannot resolve, so the
 * server-side and browser-side URLs are validated independently and never
 * assumed equal. See README → Deployment.
 */
const serverSchema = z.object({
  /** Base URL the Next.js server uses, e.g. `http://api:4000/api/v1`. */
  API_BASE_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:4000/api/v1'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('InkVision Creatives'),
  NEXT_PUBLIC_COMMERCE_ENABLED: z
    .enum(['true', 'false', '1', '0', ''])
    .default('false')
    .transform((value) => value === 'true' || value === '1'),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Validates and caches the server-side environment. Called once on first use;
 * a failure throws with a readable report rather than producing a page that
 * fetches from `undefined/articles`.
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const result = serverSchema.safeParse({
    API_BASE_URL: process.env.API_BASE_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
    NEXT_PUBLIC_COMMERCE_ENABLED: process.env.NEXT_PUBLIC_COMMERCE_ENABLED,
  });

  if (!result.success) {
    const report = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid website configuration (see .env.example):\n${report}`);
  }

  cached = result.data;
  return cached;
}

/**
 * Browser-side configuration.
 *
 * `NEXT_PUBLIC_*` values are inlined at build time, so these are literal
 * references rather than dynamic lookups — a computed `process.env[key]` would
 * not be replaced by the bundler.
 */
export const publicEnv = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? 'InkVision Creatives',
  /**
   * Mirrors the server's commerce flag so the storefront renders the right
   * affordances. The server remains the only authority on whether a purchase
   * may proceed — this only decides what the page offers.
   */
  commerceEnabled:
    process.env.NEXT_PUBLIC_COMMERCE_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_COMMERCE_ENABLED === '1',
} as const;

/** Canonical site URL with no trailing slash. */
export function siteUrl(): string {
  return publicEnv.siteUrl.replace(/\/$/, '');
}

/** Absolute URL for a site-relative path, used for canonicals and OpenGraph. */
export function absoluteUrl(path: string): string {
  const base = siteUrl();
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
