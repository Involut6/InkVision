import type { ProductStatus, PublicationStatus, WorkKind } from './enums.js';
import type { SortDirection } from './api.js';

/** A block of long-form body copy. Stored as sanitised HTML produced by the CMS. */
export interface RichText {
  /** Sanitised HTML. Already passed through the server-side sanitiser. */
  readonly html: string;
  /** Plain-text rendition used for excerpts, search and reading-time estimates. */
  readonly text: string;
}

export interface ImageRef {
  readonly url: string;
  /** Required: an image without alternative text is an accessibility defect. */
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly caption?: string;
}

export interface SeoFields {
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly ogImage?: ImageRef;
  readonly noIndex?: boolean;
}

// -----------------------------------------------------------------------------
// Services
// -----------------------------------------------------------------------------

export interface ServiceComponentDto {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
}

export interface FaqItemDto {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly position: number;
}

export interface ServiceSummaryDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** One-line positioning statement used on cards. */
  readonly tagline: string;
  /** The business need this service addresses, in plain language. */
  readonly businessNeed: string;
  readonly position: number;
  readonly icon: string | null;
}

export interface ServiceDto extends ServiceSummaryDto, SeoFields {
  readonly audience: string;
  readonly problem: RichText;
  readonly approach: RichText;
  readonly components: readonly ServiceComponentDto[];
  readonly deliverables: readonly string[];
  readonly engagementProcess: readonly ProcessStageDto[];
  readonly faqs: readonly FaqItemDto[];
  readonly ctaHeadline: string;
  readonly ctaBody: string;
  readonly relatedCaseStudies: readonly CaseStudySummaryDto[];
  readonly relatedArticles: readonly ArticleSummaryDto[];
  readonly updatedAt: string;
}

export interface ProcessStageDto {
  readonly id: string;
  readonly position: number;
  readonly title: string;
  readonly summary: string;
  readonly detail: string;
}

// -----------------------------------------------------------------------------
// Insights (articles)
// -----------------------------------------------------------------------------

export interface AuthorDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly role: string | null;
  readonly bio: string | null;
  readonly avatar: ImageRef | null;
}

export interface ArticleCategoryDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly articleCount?: number;
}

export interface TagDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export interface ArticleSummaryDto extends SeoFields {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly category: ArticleCategoryDto | null;
  readonly tags: readonly TagDto[];
  readonly author: AuthorDto | null;
  readonly featuredImage: ImageRef | null;
  readonly readingTimeMinutes: number;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly featured: boolean;
}

export interface ArticleDto extends ArticleSummaryDto {
  readonly body: RichText;
  readonly relatedArticles: readonly ArticleSummaryDto[];
}

export interface ArticleListQuery {
  page?: number;
  perPage?: number;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  sort?: 'publishedAt' | 'title';
  direction?: SortDirection;
}

// -----------------------------------------------------------------------------
// Selected work (case studies)
// -----------------------------------------------------------------------------

export interface PortfolioCategoryDto {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly caseStudyCount?: number;
}

export interface CaseStudySummaryDto extends SeoFields {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly kind: WorkKind;
  readonly category: PortfolioCategoryDto | null;
  /** Client or industry — only populated when publication has been approved. */
  readonly clientName: string | null;
  readonly industry: string | null;
  readonly coverImage: ImageRef | null;
  readonly publishedAt: string | null;
  readonly featured: boolean;
}

export interface CaseStudyExcerptDto {
  readonly id: string;
  readonly label: string;
  readonly body: string;
  readonly position: number;
}

export interface CaseStudyDto extends CaseStudySummaryDto {
  readonly challenge: RichText;
  readonly objective: RichText;
  readonly strategicQuestion: string | null;
  readonly researchApproach: RichText;
  readonly editorialApproach: RichText;
  readonly deliverables: readonly string[];
  readonly excerpts: readonly CaseStudyExcerptDto[];
  /** Present only where outcomes have been verified AND approved for publication. */
  readonly outcomes: readonly string[];
  readonly outcomesVerified: boolean;
  readonly updatedAt: string;
  readonly relatedServices: readonly ServiceSummaryDto[];
}

export interface CaseStudyListQuery {
  page?: number;
  perPage?: number;
  category?: string;
  kind?: WorkKind;
  featured?: boolean;
}

// -----------------------------------------------------------------------------
// Resources (digital products)
// -----------------------------------------------------------------------------

/** Money is always an integer count of minor units plus an ISO-4217 code. */
export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export interface ProductSummaryDto extends SeoFields {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly summary: string;
  readonly status: ProductStatus;
  readonly price: Money | null;
  readonly coverImage: ImageRef | null;
  readonly fileFormat: string | null;
  /**
   * Server-computed. True only when commerce is enabled, the product is ACTIVE,
   * a price is set and a deliverable file is attached. The browser never decides
   * this.
   */
  readonly purchasable: boolean;
  readonly featured: boolean;
}

export interface ProductDto extends ProductSummaryDto {
  readonly description: RichText;
  readonly intendedAudience: string;
  readonly benefits: readonly string[];
  readonly contents: readonly string[];
  readonly previewImages: readonly ImageRef[];
  readonly fileSizeBytes: number | null;
  readonly pageCount: number | null;
  readonly deliveryMethod: string;
  readonly refundTerms: string | null;
  readonly updatePolicy: string | null;
  readonly updatedAt: string;
}

// -----------------------------------------------------------------------------
// Site settings
// -----------------------------------------------------------------------------

export interface SocialProfile {
  readonly platform: string;
  readonly url: string;
  readonly label: string;
}

export interface PublicSiteSettingsDto {
  readonly siteName: string;
  readonly tagline: string;
  readonly supportingStatement: string;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly addressLines: readonly string[];
  readonly socialProfiles: readonly SocialProfile[];
  readonly newsletterEnabled: boolean;
  readonly newsletterHeadline: string;
  readonly newsletterBody: string;
  readonly schedulingUrl: string | null;
  readonly commerceEnabled: boolean;
  readonly defaultSeoTitle: string;
  readonly defaultSeoDescription: string;
  readonly defaultOgImage: ImageRef | null;
  readonly legalEntityName: string | null;
  /** True while legal pages still carry unreviewed template copy. */
  readonly legalPagesAwaitingReview: boolean;
}

// -----------------------------------------------------------------------------
// Testimonials — only approved, genuine entries are ever returned publicly.
// -----------------------------------------------------------------------------

export interface TestimonialDto {
  readonly id: string;
  readonly quote: string;
  readonly attributionName: string;
  readonly attributionRole: string | null;
  readonly attributionOrganisation: string | null;
  readonly publishedAt: string | null;
}

// -----------------------------------------------------------------------------
// Legal + static page content
// -----------------------------------------------------------------------------

export interface LegalPageDto extends SeoFields {
  readonly slug: 'privacy' | 'terms' | 'refund-policy';
  readonly title: string;
  readonly body: RichText;
  readonly status: PublicationStatus;
  /** Set while the template has not been reviewed by the business or counsel. */
  readonly awaitingReview: boolean;
  readonly effectiveAt: string | null;
  readonly updatedAt: string;
}

export interface FaqGroupDto {
  readonly id: string;
  readonly title: string;
  readonly position: number;
  readonly items: readonly FaqItemDto[];
}
