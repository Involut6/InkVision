'use client';

import type { ReactNode } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { cn } from '@/lib/utils';

export interface Column<T> {
  /** Stable key, also used as the header's scope target. */
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hidden below `md`. Use for secondary columns on narrow screens. */
  hideOnMobile?: boolean;
  className?: string;
}

/**
 * The admin table.
 *
 * Two renderings of the same data: a real `<table>` from `md` up, and a stacked
 * card list below it. A table squeezed onto a phone either overflows the
 * viewport or becomes unreadable, and a horizontally scrolling table is poor
 * for keyboard and screen-reader users — so the small-screen view is a
 * different layout rather than the same one shrunk.
 */
export function AdminDataTable<T>({
  rows,
  columns,
  getRowKey,
  caption,
  isLoading,
  error,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Items will appear here once they exist.',
  onRetry,
  rowHref,
  className,
}: {
  rows: readonly T[];
  columns: readonly Column<T>[];
  getRowKey: (row: T) => string;
  /** Describes the table for screen readers. */
  caption: string;
  isLoading?: boolean;
  error?: unknown;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  rowHref?: (row: T) => string;
  className?: string;
}) {
  if (isLoading) return <LoadingState label="Loading" />;

  if (error) {
    return (
      <ErrorState
        description="We could not load this list. It may be a temporary problem with the API."
        action={
          onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="text-brand text-sm font-semibold underline underline-offset-4"
            >
              Try again
            </button>
          ) : undefined
        }
      />
    );
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={className}>
      {/* --- Wide screens: a real table ----------------------------------- */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-border-strong border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'text-meta text-content-muted px-3 py-3 text-left font-semibold tracking-[0.08em] uppercase',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-border-subtle hover:bg-surface-sunken border-b transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-3 py-3.5 align-top', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Narrow screens: stacked cards with explicit field labels ------ */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="bg-surface-raised ring-border-subtle p-4 ring-1">
            <dl className="flex flex-col gap-2">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div
                    key={column.key}
                    className="flex flex-wrap items-baseline justify-between gap-2"
                  >
                    <dt className="text-meta text-content-muted font-semibold tracking-[0.08em] uppercase">
                      {column.header}
                    </dt>
                    <dd className="text-content-primary text-right text-sm">
                      {column.render(row)}
                    </dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>

      {rowHref ? <span className="sr-only">Select a row to view its details.</span> : null}
    </div>
  );
}
