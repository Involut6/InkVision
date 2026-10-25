import type { ReactNode } from 'react';

import { Heading, Meta } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

/** The standard heading block for every admin screen. */
export function AdminPage({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('px-5 py-8 lg:px-10 lg:py-10', className)}>
      <header className="border-border-subtle flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level={2} className="text-h3">
            {title}
          </Heading>
          {description ? <Meta className="max-w-measure mt-1.5">{description}</Meta> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}
