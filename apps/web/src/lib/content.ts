import { cache } from 'react';

import type {
  ArticleCategoryDto,
  ArticleDto,
  ArticleSummaryDto,
  CaseStudyDto,
  CaseStudySummaryDto,
  CommerceStatusDto,
  FaqGroupDto,
  LegalPageDto,
  Paginated,
  PortfolioCategoryDto,
  ProcessStageDto,
  ProductDto,
  ProductSummaryDto,
  PublicSiteSettingsDto,
  ServiceDto,
  ServiceSummaryDto,
  TagDto,
  TestimonialDto,
} from '@inkvision/shared-types';

import { CACHE, serverApi } from './api.server';
import { isApiError } from './api-error';

/**
 * Server-side content access.
 *
 * Every function is wrapped in React's `cache`, so a page that needs the site
 * settings in both its metadata and its layout fetches them once per request
 * instead of twice.
 *
 * `null` is returned for a missing resource and an empty collection for a
 * failed list, so a page can render a considered empty state rather than a
 * crash. A genuine 404 for a detail route is surfaced to the caller, which
 * triggers Next.js's not-found handling.
 */

async function safeList<T>(fetcher: () => Promise<T[]>, label: string): Promise<T[]> {
  try {
    return await fetcher();
  } catch (error) {
    reportContentFailure(label, error);
    return [];
  }
}

/**
 * Fetches one resource, distinguishing "there is no such thing" from "we could
 * not ask".
 *
 * The difference matters. `null` makes the caller render a 404, which tells
 * visitors and search engines the page is gone. That is true for an unknown
 * slug and false during an API outage — a 404 for an existing page is a worse
 * answer than an error, and if a crawler sees it the page can be dropped from
 * the index. So only a genuine 404 from the API becomes `null`; anything else
 * is surfaced.
 *
 * The exception is the production build. `generateStaticParams` already
 * returns nothing when its list call fails, so detail pages are not
 * prerendered during an outage — but pages with fixed slugs, the legal pages
 * among them, would fail the build. Degrading to an empty state is the better
 * outcome there: a deployment that cannot reach its API yet is a normal
 * ordering problem, not a reason to have no site at all.
 */
const IS_PRODUCTION_BUILD = process.env.NEXT_PHASE === 'phase-production-build';

async function safeDetail<T>(fetcher: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fetcher();
  } catch (error) {
    if (isApiError(error) && error.isNotFound) return null;
    reportContentFailure(label, error);
    if (IS_PRODUCTION_BUILD) return null;
    throw error;
  }
}

function reportContentFailure(label: string, error: unknown): void {
  // Logged server-side so an API outage is diagnosable, while the page still
  // renders its empty state for the visitor.
  const detail = isApiError(error) ? `${error.status} ${error.code}` : String(error);
  console.error(`[content] Failed to load ${label}: ${detail}`);
}

// -----------------------------------------------------------------------------
// Site settings
// -----------------------------------------------------------------------------

/**
 * Site settings, with a fallback.
 *
 * The header, footer and metadata all depend on this, so a transient API
 * failure must not blank the entire site. The fallback carries the brand's
 * actual positioning copy and nothing fabricated.
 */
export const getSiteSettings = cache(async (): Promise<PublicSiteSettingsDto> => {
  try {
    return await serverApi().get<PublicSiteSettingsDto>('/site-settings', { next: CACHE.settings });
  } catch (error) {
    reportContentFailure('site settings', error);

    return {
      siteName: 'InkVision Creatives',
      tagline: 'Make your expertise visible.',
      supportingStatement:
        'Executive visibility, thought leadership and strategic communications for people and organisations with something valuable to say.',
      contactEmail: null,
      contactPhone: null,
      addressLines: [],
      socialProfiles: [],
      newsletterEnabled: false,
      newsletterHeadline: 'Insights on executive visibility',
      newsletterBody: '',
      schedulingUrl: null,
      commerceEnabled: false,
      defaultSeoTitle: 'InkVision Creatives — Make your expertise visible.',
      defaultSeoDescription:
        'Executive visibility, thought leadership and strategic communications for people and organisations with something valuable to say.',
      defaultOgImage: null,
      legalEntityName: null,
      legalPagesAwaitingReview: true,
    };
  }
});

// -----------------------------------------------------------------------------
// Services
// -----------------------------------------------------------------------------

export const getServices = cache(async (): Promise<ServiceSummaryDto[]> =>
  safeList(
    () => serverApi().get<ServiceSummaryDto[]>('/services', { next: CACHE.services }),
    'services',
  ),
);

export const getService = cache(async (slug: string): Promise<ServiceDto | null> => {
  return safeDetail(
    () =>
      serverApi().get<ServiceDto>(`/services/${encodeURIComponent(slug)}`, {
        next: CACHE.services,
      }),
    `service ${slug}`,
  );
});

// -----------------------------------------------------------------------------
// Approach, FAQs, testimonials, legal
// -----------------------------------------------------------------------------

export type ApproachStage = ProcessStageDto & { clientRole: string; slug: string };

export const getApproachStages = cache(async (): Promise<ApproachStage[]> =>
  safeList(
    () => serverApi().get<ApproachStage[]>('/approach', { next: CACHE.pages }),
    'approach stages',
  ),
);

export const getFaqGroups = cache(async (): Promise<FaqGroupDto[]> =>
  safeList(() => serverApi().get<FaqGroupDto[]>('/faqs', { next: CACHE.pages }), 'FAQs'),
);

export const getTestimonials = cache(async (): Promise<TestimonialDto[]> =>
  safeList(
    () => serverApi().get<TestimonialDto[]>('/testimonials', { next: CACHE.pages }),
    'testimonials',
  ),
);

export const getLegalPage = cache(async (slug: string): Promise<LegalPageDto | null> => {
  return safeDetail(
    () =>
      serverApi().get<LegalPageDto>(`/legal/${encodeURIComponent(slug)}`, {
        next: CACHE.pages,
      }),
    `legal page ${slug}`,
  );
});

// -----------------------------------------------------------------------------
// Insights
// -----------------------------------------------------------------------------

export interface ArticleQuery {
  page?: number;
  perPage?: number;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
}

const EMPTY_PAGE = {
  data: [],
  meta: {
    page: 1,
    perPage: 12,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
} as const;

export const getArticles = cache(
  async (query: ArticleQuery = {}): Promise<Paginated<ArticleSummaryDto>> => {
    try {
      return await serverApi().get<Paginated<ArticleSummaryDto>>('/articles', {
        query: {
          page: query.page,
          perPage: query.perPage,
          category: query.category,
          tag: query.tag,
          search: query.search,
          featured: query.featured,
        },
        next: CACHE.articles,
      });
    } catch (error) {
      reportContentFailure('articles', error);
      return EMPTY_PAGE;
    }
  },
);

export const getArticle = cache(async (slug: string): Promise<ArticleDto | null> => {
  return safeDetail(
    () =>
      serverApi().get<ArticleDto>(`/articles/${encodeURIComponent(slug)}`, {
        next: CACHE.articles,
      }),
    `article ${slug}`,
  );
});

export const getArticleCategories = cache(async (): Promise<ArticleCategoryDto[]> =>
  safeList(
    () => serverApi().get<ArticleCategoryDto[]>('/articles/categories', { next: CACHE.articles }),
    'article categories',
  ),
);

export const getArticleTags = cache(async (): Promise<TagDto[]> =>
  safeList(() => serverApi().get<TagDto[]>('/articles/tags', { next: CACHE.articles }), 'tags'),
);

// -----------------------------------------------------------------------------
// Selected work
// -----------------------------------------------------------------------------

export interface CaseStudyQuery {
  page?: number;
  perPage?: number;
  category?: string;
  kind?: string;
  featured?: boolean;
}

export const getCaseStudies = cache(
  async (query: CaseStudyQuery = {}): Promise<Paginated<CaseStudySummaryDto>> => {
    try {
      return await serverApi().get<Paginated<CaseStudySummaryDto>>('/case-studies', {
        query: {
          page: query.page,
          perPage: query.perPage,
          category: query.category,
          kind: query.kind,
          featured: query.featured,
        },
        next: CACHE.caseStudies,
      });
    } catch (error) {
      reportContentFailure('case studies', error);
      return EMPTY_PAGE;
    }
  },
);

export const getCaseStudy = cache(async (slug: string): Promise<CaseStudyDto | null> => {
  return safeDetail(
    () =>
      serverApi().get<CaseStudyDto>(`/case-studies/${encodeURIComponent(slug)}`, {
        next: CACHE.caseStudies,
      }),
    `case study ${slug}`,
  );
});

export const getPortfolioCategories = cache(async (): Promise<PortfolioCategoryDto[]> =>
  safeList(
    () =>
      serverApi().get<PortfolioCategoryDto[]>('/case-studies/categories', {
        next: CACHE.caseStudies,
      }),
    'portfolio categories',
  ),
);

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------

export const getProducts = cache(async (): Promise<ProductSummaryDto[]> =>
  safeList(
    () => serverApi().get<ProductSummaryDto[]>('/products', { next: CACHE.products }),
    'products',
  ),
);

export const getProduct = cache(async (slug: string): Promise<ProductDto | null> => {
  return safeDetail(
    () =>
      serverApi().get<ProductDto>(`/products/${encodeURIComponent(slug)}`, {
        next: CACHE.products,
      }),
    `product ${slug}`,
  );
});

export const getCommerceStatus = cache(async (): Promise<CommerceStatusDto> => {
  try {
    return await serverApi().get<CommerceStatusDto>('/commerce/status', { next: CACHE.products });
  } catch (error) {
    reportContentFailure('commerce status', error);
    // Failing closed is the only safe default: never offer a purchase the
    // server has not confirmed it can take.
    return { enabled: false, provider: 'none', currency: 'NGN', reason: null };
  }
});
