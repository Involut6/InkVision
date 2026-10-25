/**
 * Enumerations shared between the API and the website.
 *
 * These mirror the PostgreSQL enums declared in `apps/api/prisma/schema.prisma`.
 * They are plain string-literal unions (plus `const` lookup objects) so the
 * website can depend on them without pulling in the Prisma client.
 */

export const ADMIN_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'ENQUIRY_MANAGER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * Granular, server-enforced permissions. Roles are bundles of these; every
 * protected endpoint declares the permission it needs rather than a role, so
 * the role map can change without touching controllers.
 */
export const PERMISSIONS = [
  'enquiry:read',
  'enquiry:write',
  'enquiry:export',
  'article:read',
  'article:write',
  'article:publish',
  'case_study:read',
  'case_study:write',
  'case_study:publish',
  'service:read',
  'service:write',
  'product:read',
  'product:write',
  'order:read',
  'order:write',
  'newsletter:read',
  'newsletter:write',
  'settings:read',
  'settings:write',
  'user:read',
  'user:write',
  'audit:read',
  'upload:write',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Canonical role → permission map. The API is the single source of truth. */
export const ROLE_PERMISSIONS: Readonly<Record<AdminRole, readonly Permission[]>> = {
  OWNER: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((permission) => permission !== 'user:write'),
  EDITOR: [
    'article:read',
    'article:write',
    'article:publish',
    'case_study:read',
    'case_study:write',
    'service:read',
    'service:write',
    'product:read',
    'settings:read',
    'upload:write',
  ],
  ENQUIRY_MANAGER: ['enquiry:read', 'enquiry:write', 'enquiry:export', 'newsletter:read'],
};

export const ENQUIRY_STATUSES = [
  'NEW',
  'REVIEWING',
  'QUALIFIED',
  'IN_DISCUSSION',
  'CONVERTED',
  'CLOSED',
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Readonly<Record<EnquiryStatus, string>> = {
  NEW: 'New',
  REVIEWING: 'Reviewing',
  QUALIFIED: 'Qualified',
  IN_DISCUSSION: 'In discussion',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
};

/** Service interest captured on the enquiry form. */
export const SERVICE_INTERESTS = [
  'EXECUTIVE_VISIBILITY',
  'THOUGHT_LEADERSHIP_GHOSTWRITING',
  'STRATEGIC_CONTENT_COMMUNICATIONS',
  'EXECUTIVE_COMMUNICATIONS',
  'DIGITAL_PRODUCTS_WORKSHOPS',
  'NOT_SURE_YET',
] as const;
export type ServiceInterest = (typeof SERVICE_INTERESTS)[number];

export const SERVICE_INTEREST_LABELS: Readonly<Record<ServiceInterest, string>> = {
  EXECUTIVE_VISIBILITY: 'Executive visibility',
  THOUGHT_LEADERSHIP_GHOSTWRITING: 'Thought leadership / ghostwriting',
  STRATEGIC_CONTENT_COMMUNICATIONS: 'Strategic content and communications',
  EXECUTIVE_COMMUNICATIONS: 'Executive communications',
  DIGITAL_PRODUCTS_WORKSHOPS: 'Digital products / workshops',
  NOT_SURE_YET: 'Not sure yet',
};

export const ENQUIRY_TIMELINES = [
  'IMMEDIATELY',
  'WITHIN_ONE_MONTH',
  'ONE_TO_THREE_MONTHS',
  'THREE_TO_SIX_MONTHS',
  'EXPLORING',
] as const;
export type EnquiryTimeline = (typeof ENQUIRY_TIMELINES)[number];

export const ENQUIRY_TIMELINE_LABELS: Readonly<Record<EnquiryTimeline, string>> = {
  IMMEDIATELY: 'As soon as possible',
  WITHIN_ONE_MONTH: 'Within the next month',
  ONE_TO_THREE_MONTHS: 'In one to three months',
  THREE_TO_SIX_MONTHS: 'In three to six months',
  EXPLORING: 'Exploring options for now',
};

export const PUBLICATION_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/**
 * How a portfolio entry came about. The distinction is deliberate: illustrative
 * work must never be presented as commissioned client work.
 */
export const WORK_KINDS = ['COMMISSIONED', 'SAMPLE', 'CONCEPT'] as const;
export type WorkKind = (typeof WORK_KINDS)[number];

export const WORK_KIND_LABELS: Readonly<Record<WorkKind, string>> = {
  COMMISSIONED: 'Commissioned client work',
  SAMPLE: 'Illustrative sample',
  CONCEPT: 'Strategic concept',
};

export const PRODUCT_STATUSES = ['DRAFT', 'COMING_SOON', 'ACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Readonly<Record<ProductStatus, string>> = {
  DRAFT: 'Draft',
  COMING_SOON: 'Coming soon',
  ACTIVE: 'Available',
  ARCHIVED: 'Archived',
};

export const ORDER_STATUSES = [
  'PENDING',
  'AWAITING_PAYMENT',
  'PAID',
  'FULFILLED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'INITIATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'PENDING',
  'AVAILABLE',
  'DELIVERED',
  'EXPIRED',
  'REVOKED',
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const NEWSLETTER_STATUSES = ['PENDING', 'SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED'] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];
