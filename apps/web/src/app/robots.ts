import type { MetadataRoute } from 'next';

import { absoluteUrl, siteUrl } from '@/lib/env';

/**
 * Robots directives.
 *
 * The administration portal, the order pages and the newsletter-unsubscribe
 * route are disallowed. They are additionally protected by `X-Robots-Tag`
 * headers (see `next.config.ts`) and, for the admin area, by authentication —
 * robots.txt is a request, not a control.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/resources/order/',
          '/newsletter/unsubscribe',
          // Filtered and searched listings duplicate the canonical listing.
          '/insights?',
          '/work?',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl(),
  };
}
