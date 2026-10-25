import type { PublicationStatus } from '@inkvision/shared-types';

/**
 * The single definition of "publicly visible".
 *
 * Every public query composes this, which is what guarantees draft, scheduled
 * and archived content cannot leak: there is one rule, not one per endpoint.
 *
 * A SCHEDULED row becomes visible once its `publishedAt` has passed, so
 * scheduling needs no background job to be correct — the read path enforces it.
 */
export function publishedContentWhere(now: Date = new Date()) {
  return {
    OR: [
      { status: 'PUBLISHED' as PublicationStatus, publishedAt: { lte: now } },
      { status: 'SCHEDULED' as PublicationStatus, publishedAt: { lte: now } },
    ],
  };
}

/** Variant for rows whose publication needs no timestamp (e.g. services). */
export function publishedWhere() {
  return { status: 'PUBLISHED' as PublicationStatus };
}

/** True when a row should be served to an anonymous visitor. */
export function isPubliclyVisible(
  row: { status: PublicationStatus; publishedAt?: Date | null },
  now: Date = new Date(),
): boolean {
  if (row.status === 'DRAFT' || row.status === 'ARCHIVED') return false;
  if (row.status === 'PUBLISHED')
    return row.publishedAt === undefined || (row.publishedAt ?? now) <= now;
  // SCHEDULED
  return row.publishedAt !== null && row.publishedAt !== undefined && row.publishedAt <= now;
}
