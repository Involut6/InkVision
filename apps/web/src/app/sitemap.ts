import type { MetadataRoute } from 'next';

import { getArticles, getCaseStudies, getProducts, getServices } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';

/**
 * XML sitemap.
 *
 * Only publicly indexable pages are listed. Admin routes, filtered listings and
 * the newsletter-unsubscribe route are excluded by construction rather than by
 * a robots rule, because a sitemap that advertises private routes is worse than
 * one that omits them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: absoluteUrl('/services'), lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/approach'), lastModified: now, changeFrequency: 'yearly', priority: 0.8 },
    { url: absoluteUrl('/work'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/insights'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/resources'), lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'yearly', priority: 0.7 },
    { url: absoluteUrl('/contact'), lastModified: now, changeFrequency: 'yearly', priority: 0.9 },
    { url: absoluteUrl('/faq'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: absoluteUrl('/refund-policy'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  // Each list returns only published content, so nothing unpublished can leak
  // into the sitemap even if an editor is mid-draft.
  const [services, articles, caseStudies, products] = await Promise.all([
    getServices(),
    getArticles({ perPage: 100 }),
    getCaseStudies({ perPage: 100 }),
    getProducts(),
  ]);

  return [
    ...staticRoutes,
    ...services.map((service) => ({
      url: absoluteUrl(`/services/${service.slug}`),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...articles.data
      .filter((article) => !article.noIndex)
      .map((article) => ({
        url: absoluteUrl(`/insights/${article.slug}`),
        lastModified: new Date(article.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ...caseStudies.data.map((caseStudy) => ({
      url: absoluteUrl(`/work/${caseStudy.slug}`),
      lastModified: caseStudy.publishedAt ? new Date(caseStudy.publishedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...products
      .filter((product) => !product.noIndex)
      .map((product) => ({
        url: absoluteUrl(`/resources/${product.slug}`),
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
  ];
}
