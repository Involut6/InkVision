import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Heading, Meta } from '@/components/ui/typography';
import type { ArticleSummaryDto } from '@inkvision/shared-types';
import { formatDate, isoDate, readingTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

/** An article card for the insights listing and related-reading rows. */
export function InsightCard({
  article,
  className,
  showCategory = true,
}: {
  article: ArticleSummaryDto;
  className?: string;
  showCategory?: boolean;
}) {
  return (
    <article className={cn('group bg-surface-raised flex flex-col', className)}>
      <Link href={`/insights/${article.slug}`} className="flex flex-1 flex-col gap-4 p-7 lg:p-8">
        {showCategory && article.category ? (
          <Badge tone="brand">{article.category.name}</Badge>
        ) : null}

        <Heading
          level={3}
          as="h3"
          className="group-hover:text-brand group-focus-visible:text-brand transition-colors"
        >
          {article.title}
        </Heading>

        <p className="text-content-secondary text-sm leading-relaxed">{article.summary}</p>

        <Meta className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
          {article.publishedAt ? (
            <time dateTime={isoDate(article.publishedAt)}>{formatDate(article.publishedAt)}</time>
          ) : null}
          {article.publishedAt ? <span aria-hidden="true">·</span> : null}
          <span>{readingTime(article.readingTimeMinutes)}</span>
          {article.author ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{article.author.name}</span>
            </>
          ) : null}
        </Meta>
      </Link>
    </article>
  );
}
