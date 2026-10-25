import type { ReactNode } from 'react';

import { Breadcrumbs, type Crumb } from '@/components/site/breadcrumbs';
import { Display, Eyebrow, GoldRule, Lead } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

/**
 * The standard page opening.
 *
 * Every page below the homepage uses it, so breadcrumbs, the eyebrow, the
 * display heading and the standfirst are spaced identically throughout.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  trail,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  trail?: readonly Crumb[];
  /** Optional content set beside the heading on wide screens. */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('border-border-subtle bg-surface border-b', className)}>
      <div className="page-shell py-12 sm:py-16 lg:py-20">
        {trail ? <Breadcrumbs trail={trail} className="mb-8" /> : null}

        <div
          className={cn(
            'grid gap-10',
            aside ? 'lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16' : '',
          )}
        >
          <div className="flex flex-col gap-5">
            <GoldRule />
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            <Display as="h1">{title}</Display>
            {lead ? <Lead>{lead}</Lead> : null}
          </div>

          {aside ? <div className="flex flex-col justify-end">{aside}</div> : null}
        </div>
      </div>
    </header>
  );
}
