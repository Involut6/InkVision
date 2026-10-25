import { Badge } from '@/components/ui/badge';
import {
  ENQUIRY_STATUS_LABELS,
  PRODUCT_STATUS_LABELS,
  type EnquiryStatus,
  type ProductStatus,
  type PublicationStatus,
} from '@inkvision/shared-types';

/**
 * Status chips.
 *
 * Colour alone never carries the meaning: the label is always present, which is
 * what makes these legible to a colour-blind user and in a forced-colours mode.
 */
export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const tone = {
    NEW: 'brand',
    REVIEWING: 'neutral',
    QUALIFIED: 'accent',
    IN_DISCUSSION: 'warning',
    CONVERTED: 'success',
    CLOSED: 'neutral',
  }[status] as 'brand' | 'neutral' | 'accent' | 'warning' | 'success';

  return <Badge tone={tone}>{ENQUIRY_STATUS_LABELS[status]}</Badge>;
}

export function PublicationStatusBadge({ status }: { status: PublicationStatus }) {
  const tone = {
    DRAFT: 'neutral',
    SCHEDULED: 'warning',
    PUBLISHED: 'success',
    ARCHIVED: 'neutral',
  }[status] as 'neutral' | 'warning' | 'success';

  const label = {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
  }[status];

  return <Badge tone={tone}>{label}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const tone = {
    DRAFT: 'neutral',
    COMING_SOON: 'warning',
    ACTIVE: 'success',
    ARCHIVED: 'neutral',
  }[status] as 'neutral' | 'warning' | 'success';

  return <Badge tone={tone}>{PRODUCT_STATUS_LABELS[status]}</Badge>;
}
