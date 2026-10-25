import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import type { PaginationMeta } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * Pagination.
 *
 * Rendered as real links rather than buttons, so pages are crawlable, work
 * without JavaScript and can be opened in a new tab. The current page is marked
 * with `aria-current`, and the whole control is labelled for screen readers.
 */
export function Pagination({
  meta,
  basePath,
  searchParams = {},
  className,
}: {
  meta: PaginationMeta;
  basePath: string;
  /** Preserved across page links so filters survive navigation. */
  searchParams?: Record<string, string | undefined>;
  className?: string;
}) {
  if (meta.totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = pageWindow(meta.page, meta.totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4', className)}
    >
      <PageLink
        href={hrefFor(meta.page - 1)}
        disabled={!meta.hasPreviousPage}
        aria-label="Previous page"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Previous</span>
      </PageLink>

      <ol className="flex items-center gap-1">
        {pages.map((page, index) =>
          page === null ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="text-meta text-content-muted px-2"
            >
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={hrefFor(page)}
                aria-current={page === meta.page ? 'page' : undefined}
                aria-label={`Page ${page}`}
                className={cn(
                  'tabular inline-flex size-10 items-center justify-center text-sm transition-colors',
                  page === meta.page
                    ? 'bg-brand text-content-inverse font-semibold'
                    : 'text-content-secondary hover:bg-surface-sunken hover:text-content-primary',
                )}
              >
                {page}
              </Link>
            </li>
          ),
        )}
      </ol>

      <PageLink href={hrefFor(meta.page + 1)} disabled={!meta.hasNextPage} aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight aria-hidden="true" className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  children,
  ...props
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
  'aria-label': string;
}) {
  const classes =
    'inline-flex h-10 items-center gap-1.5 border border-border-strong px-3.5 text-sm font-medium transition-colors';

  // A disabled control is rendered as a span rather than a link: a link to
  // nowhere is reachable by keyboard and announces itself as navigable.
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          classes,
          'border-border-subtle text-content-muted cursor-not-allowed opacity-60',
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={cn(classes, 'hover:border-brand hover:text-brand')} {...props}>
      {children}
    </Link>
  );
}

/** Page numbers around the current one, with gaps for the rest. */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  let previous = 0;

  for (const page of sorted) {
    if (previous && page - previous > 1) result.push(null);
    result.push(page);
    previous = page;
  }

  return result;
}
