import { AlertTriangle, FileQuestion, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Body, Heading, Meta } from './typography';

/**
 * The shared loading, empty and error states.
 *
 * Having one of each means a visitor meets the same language and layout
 * whichever part of the site is waiting, missing or broken — and that an empty
 * section reads as a deliberate state rather than a gap.
 */

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-border-strong flex flex-col items-center gap-4 border border-dashed',
        'bg-surface-sunken px-6 py-14 text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="text-content-muted">
        {icon ?? <Inbox className="size-7" />}
      </span>
      <Heading level={3} as="p">
        {title}
      </Heading>
      <Body className="mx-auto max-w-[36rem] text-center">{description}</Body>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    // `aria-live="polite"` so a screen reader is told the region is busy
    // without the announcement interrupting what the user is doing.
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-3 px-6 py-14', className)}
    >
      <Loader2 aria-hidden="true" className="text-brand size-5 animate-spin" />
      <Meta>{label}…</Meta>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this just now. Please try again in a moment.',
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'border-danger/25 bg-danger-soft flex flex-col items-center gap-4 border',
        'px-6 py-12 text-center',
        className,
      )}
    >
      <AlertTriangle aria-hidden="true" className="text-danger size-6" />
      <Heading level={3} as="p">
        {title}
      </Heading>
      <Body className="mx-auto max-w-[36rem] text-center">{description}</Body>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function NotFoundState({
  title = 'We could not find that page',
  description = 'The link may be out of date, or the page may have moved.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <EmptyState
      icon={<FileQuestion className="size-7" />}
      title={title}
      description={description}
      action={action}
    />
  );
}

/** Content-shaped placeholder used while a list streams in. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="[&>*]:ring-border-subtle grid gap-px sm:grid-cols-2 lg:grid-cols-3 [&>*]:ring-1"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-surface-raised p-7">
          <div className="bg-ink-100 h-3 w-20 animate-pulse" />
          <div className="bg-ink-100 mt-5 h-6 w-4/5 animate-pulse" />
          <div className="bg-ink-100 mt-3 h-4 w-full animate-pulse" />
          <div className="bg-ink-100 mt-2 h-4 w-3/4 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
