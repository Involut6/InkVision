import { ApiClient } from './api-client';
import { serverEnv } from './env';

/**
 * Server-side API client for React Server Components, route handlers and
 * metadata generation.
 *
 * Public content is fetched here rather than in the browser: it keeps the pages
 * server-rendered for search engines and avoids shipping a loading state for
 * content that is the same for everyone.
 */
let client: ApiClient | null = null;

export function serverApi(): ApiClient {
  if (!client) {
    client = new ApiClient(serverEnv().API_BASE_URL, { credentials: 'omit' });
  }
  return client;
}

/**
 * Revalidation windows for public content.
 *
 * Editorial content changes rarely, so it is cached and refreshed in the
 * background. Each is tagged, so the admin portal can invalidate precisely
 * after a publish rather than waiting for the window to lapse.
 */
export const CACHE = {
  settings: { revalidate: 300, tags: ['site-settings'] },
  services: { revalidate: 300, tags: ['services'] },
  articles: { revalidate: 120, tags: ['articles'] },
  caseStudies: { revalidate: 120, tags: ['case-studies'] },
  products: { revalidate: 120, tags: ['products'] },
  pages: { revalidate: 300, tags: ['pages'] },
} as const satisfies Record<string, { revalidate: number; tags: string[] }>;
