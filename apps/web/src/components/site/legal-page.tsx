import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Section } from '@/components/home/section';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { EmptyState } from '@/components/ui/states';
import { Meta } from '@/components/ui/typography';
import type { LegalPageDto } from '@inkvision/shared-types';
import { formatDate, isoDate } from '@/lib/utils';

/**
 * Shared renderer for the three legal pages.
 *
 * The `awaitingReview` notice is deliberately prominent rather than a footnote.
 * These are unreviewed templates; presenting them as settled policy would
 * misrepresent the business's legal position to its own visitors.
 */
export function LegalPageView({
  page,
  trailLabel,
}: {
  page: LegalPageDto | null;
  trailLabel: string;
}) {
  if (!page) {
    return (
      <Section>
        <EmptyState
          title="This page is being updated"
          description="It will be back shortly. If you need this information now, please get in touch."
          action={
            <Button asChild>
              <Link href="/contact">Contact us</Link>
            </Button>
          }
        />
      </Section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title={page.title}
        trail={[{ label: trailLabel, href: `/${page.slug}` }]}
      />

      {page.awaitingReview ? (
        <div className="border-warning/25 bg-warning-soft border-b">
          <div className="page-shell flex items-start gap-3 py-5">
            <AlertTriangle aria-hidden="true" className="text-warning mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-warning text-sm font-semibold">
                This page is a template awaiting review.
              </p>
              <p className="max-w-measure-wide text-warning mt-1 text-sm leading-relaxed">
                It has not been checked by a qualified adviser and does not constitute legal advice.
                Placeholders in square brackets are still to be completed by InkVision Creatives. If
                you need to rely on any of it, please{' '}
                <Link href="/contact" className="underline underline-offset-4">
                  contact us
                </Link>{' '}
                first.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Section>
        <div className="flex flex-col gap-6">
          {page.effectiveAt ? (
            <Meta>
              In effect from{' '}
              <time dateTime={isoDate(page.effectiveAt)}>{formatDate(page.effectiveAt)}</time>
            </Meta>
          ) : null}

          <RichText html={page.body.html} as="article" />

          <Meta className="border-border-subtle border-t pt-6">
            Last updated{' '}
            <time dateTime={isoDate(page.updatedAt)}>{formatDate(page.updatedAt)}</time>.
          </Meta>
        </div>
      </Section>
    </>
  );
}
