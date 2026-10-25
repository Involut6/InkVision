import type {
  AdminRole,
  EnquiryStatus,
  EnquiryTimeline,
  NewsletterStatus,
  ServiceInterest,
} from './enums.js';
import type { SortDirection } from './api.js';

/** Payload accepted by `POST /api/v1/enquiries`. Validated on both tiers. */
export interface CreateEnquiryInput {
  fullName: string;
  workEmail: string;
  organisationOrRole?: string;
  serviceInterest: ServiceInterest;
  message: string;
  timeline: EnquiryTimeline;
  budgetRange?: string;
  referralSource?: string;
  /** Explicit consent to be contacted about this enquiry. Must be true. */
  consent: boolean;
  /** Honeypot: must stay empty. Real browsers never fill it. */
  website?: string;
}

/** Deliberately minimal — a public endpoint must not echo stored data back. */
export interface CreateEnquiryResponse {
  readonly received: true;
  readonly reference: string;
  readonly message: string;
  /** True when an identical enquiry was already recorded within the dedupe window. */
  readonly duplicate: boolean;
}

export interface EnquiryNoteDto {
  readonly id: string;
  readonly body: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly createdAt: string;
}

export interface EnquiryStatusChangeDto {
  readonly id: string;
  readonly fromStatus: EnquiryStatus | null;
  readonly toStatus: EnquiryStatus;
  readonly changedById: string | null;
  readonly changedByName: string | null;
  readonly reason: string | null;
  readonly createdAt: string;
}

export interface EnquirySummaryDto {
  readonly id: string;
  readonly reference: string;
  readonly fullName: string;
  readonly workEmail: string;
  readonly organisationOrRole: string | null;
  readonly serviceInterest: ServiceInterest;
  readonly timeline: EnquiryTimeline;
  readonly status: EnquiryStatus;
  readonly assignedToId: string | null;
  readonly assignedToName: string | null;
  readonly followUpAt: string | null;
  readonly noteCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnquiryDto extends EnquirySummaryDto {
  readonly message: string;
  readonly budgetRange: string | null;
  readonly referralSource: string | null;
  readonly consentAt: string;
  readonly notes: readonly EnquiryNoteDto[];
  readonly statusHistory: readonly EnquiryStatusChangeDto[];
}

export interface EnquiryListQuery {
  page?: number;
  perPage?: number;
  status?: EnquiryStatus;
  serviceInterest?: ServiceInterest;
  search?: string;
  from?: string;
  to?: string;
  assignedToId?: string;
  sort?: 'createdAt' | 'updatedAt' | 'status';
  direction?: SortDirection;
}

export interface UpdateEnquiryInput {
  status?: EnquiryStatus;
  assignedToId?: string | null;
  followUpAt?: string | null;
  statusReason?: string;
}

// -----------------------------------------------------------------------------
// Newsletter
// -----------------------------------------------------------------------------

export interface NewsletterSubscribeInput {
  email: string;
  fullName?: string;
  source?: string;
  consent: boolean;
}

export interface NewsletterSubscribeResponse {
  readonly status: Extract<NewsletterStatus, 'PENDING' | 'SUBSCRIBED'>;
  readonly message: string;
  /** True when the address was already on the list — reported as success. */
  readonly alreadySubscribed: boolean;
}

export interface NewsletterSubscriberDto {
  readonly id: string;
  readonly email: string;
  readonly fullName: string | null;
  readonly status: NewsletterStatus;
  readonly source: string | null;
  readonly subscribedAt: string | null;
  readonly unsubscribedAt: string | null;
  readonly createdAt: string;
}

// -----------------------------------------------------------------------------
// Admin identity
// -----------------------------------------------------------------------------

export interface AdminUserDto {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: AdminRole;
  readonly permissions: readonly string[];
  readonly isActive: boolean;
  readonly lastLoginAt: string | null;
  readonly createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly user: AdminUserDto;
  readonly csrfToken: string;
}

export interface AuditLogDto {
  readonly id: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly actorId: string | null;
  readonly actorEmail: string | null;
  readonly summary: string;
  readonly createdAt: string;
}

export interface AdminDashboardDto {
  readonly enquiries: {
    readonly total: number;
    readonly inRange: number;
    readonly byStatus: Readonly<Record<EnquiryStatus, number>>;
    readonly recent: readonly EnquirySummaryDto[];
  };
  readonly content: {
    readonly publishedArticles: number;
    readonly draftArticles: number;
    readonly publishedCaseStudies: number;
    readonly draftCaseStudies: number;
    readonly activeProducts: number;
    readonly totalProducts: number;
    readonly newsletterSubscribers: number;
  };
  readonly recentActivity: readonly AuditLogDto[];
  readonly range: { readonly from: string; readonly to: string };
}
