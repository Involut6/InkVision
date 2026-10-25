/** Transport-level contracts shared by every endpoint. */

/** Cursor-free, page-based pagination metadata returned with every list. */
export interface PaginationMeta {
  readonly page: number;
  readonly perPage: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface Paginated<T> {
  readonly data: readonly T[];
  readonly meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

export type SortDirection = 'asc' | 'desc';

/**
 * The single error shape every endpoint returns. Deliberately free of stack
 * traces, driver messages and internal identifiers.
 */
export interface ApiErrorBody {
  readonly statusCode: number;
  readonly error: string;
  /** Machine-readable code, e.g. `VALIDATION_FAILED`, `INVALID_CREDENTIALS`. */
  readonly code: string;
  /** Human-readable, safe-to-display message. */
  readonly message: string;
  /** Field-level validation problems, keyed by (possibly nested) field path. */
  readonly details?: Readonly<Record<string, readonly string[]>>;
  /** Correlation id also present in the server logs. */
  readonly requestId?: string;
  readonly timestamp: string;
  readonly path?: string;
}

export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'COMMERCE_DISABLED',
  'PRODUCT_UNAVAILABLE',
  'PAYMENT_VERIFICATION_FAILED',
  'DOWNLOAD_LINK_INVALID',
  'DOWNLOAD_LIMIT_REACHED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Health and readiness payloads. */
export interface HealthResponse {
  readonly status: 'ok';
  readonly uptimeSeconds: number;
  readonly timestamp: string;
  readonly version: string;
}

export interface ReadinessCheck {
  readonly name: string;
  readonly status: 'up' | 'down';
  readonly detail?: string;
  readonly durationMs: number;
}

export interface ReadinessResponse {
  readonly status: 'ready' | 'not_ready';
  readonly checks: readonly ReadinessCheck[];
  readonly timestamp: string;
}
