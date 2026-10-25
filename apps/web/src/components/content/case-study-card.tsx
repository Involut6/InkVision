import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Heading, Meta } from '@/components/ui/typography';
import { WORK_KIND_LABELS, type CaseStudySummaryDto } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * A portfolio card.
 *
 * The work kind is always shown, as a badge, and commissioned work is toned
 * differently from illustrative work. This is a content-integrity requirement:
 * a sample must never read as a client engagement.
 */
export function CaseStudyCard({
  caseStudy,
  className,
}: {
  caseStudy: CaseStudySummaryDto;
  className?: string;
}) {
  const isCommissioned = caseStudy.kind === 'COMMISSIONED';

  return (
    <article className={cn('group bg-surface-raised flex flex-col', className)}>
      <Link href={`/work/${caseStudy.slug}`} className="flex flex-1 flex-col gap-4 p-7 lg:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={isCommissioned ? 'brand' : 'neutral'}>
            {WORK_KIND_LABELS[caseStudy.kind]}
          </Badge>
          {caseStudy.category ? <Badge tone="neutral">{caseStudy.category.name}</Badge> : null}
        </div>

        <Heading
          level={3}
          as="h3"
          className="group-hover:text-brand group-focus-visible:text-brand transition-colors"
        >
          {caseStudy.title}
        </Heading>

        <p className="text-content-secondary text-sm leading-relaxed">{caseStudy.summary}</p>

        {/* The client is named only where disclosure was approved; otherwise the
            industry stands in, which is what the API returns. */}
        {caseStudy.clientName || caseStudy.industry ? (
          <Meta className="mt-auto pt-2">{caseStudy.clientName ?? caseStudy.industry}</Meta>
        ) : null}
      </Link>
    </article>
  );
}
