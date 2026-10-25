import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A homepage section wrapper.
 *
 * Vertical rhythm and surface alternation are decided here rather than per
 * section, which is what keeps the page feeling like one document.
 */
export function Section({
  children,
  tone = 'default',
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  tone?: 'default' | 'sunken' | 'inverse';
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'border-border-subtle border-b py-16 sm:py-20 lg:py-24',
        tone === 'sunken' && 'bg-surface-sunken',
        tone === 'inverse' && 'bg-surface-inverse border-transparent text-white',
        className,
      )}
    >
      <div className="page-shell">{children}</div>
    </section>
  );
}

/**
 * The hairline grid used for card collections.
 *
 * Each card carries a 1px ring and the grid uses a 1px gap, so adjacent rings
 * overlap exactly and read as a single dividing rule. An earlier version
 * painted the container and let the background show through the gaps, which
 * left a large block of flat colour whenever a row was not full — a one-item
 * row showed two empty cells of grey.
 */
export function CardGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const columnClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  return (
    <div
      className={cn('grid gap-px', '[&>*]:ring-border-subtle [&>*]:ring-1', columnClass, className)}
    >
      {children}
    </div>
  );
}
