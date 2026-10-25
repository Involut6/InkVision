import * as icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Heading, Meta } from '@/components/ui/typography';
import type { ServiceSummaryDto } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * Resolves a Lucide icon by the name stored on the service record.
 *
 * Falls back to a neutral mark rather than throwing, so a CMS typo degrades to
 * a plain card instead of a broken page.
 */
function ServiceIcon({ name }: { name: string | null }) {
  const Fallback = icons.Minus;
  const resolved = name ? (icons as unknown as Record<string, unknown>)[name] : undefined;
  const Icon = (typeof resolved === 'function' ? resolved : Fallback) as typeof Fallback;

  return <Icon aria-hidden="true" className="text-accent size-5" />;
}

/**
 * A service card.
 *
 * Each states the business need the service addresses — the brief's
 * requirement — rather than listing features, and the whole card is one link
 * so the target is large and unambiguous.
 */
export function ServiceCard({
  service,
  index,
  className,
}: {
  service: ServiceSummaryDto;
  /** Ordinal shown as editorial numbering. */
  index?: number;
  className?: string;
}) {
  return (
    <article className={cn('group bg-surface-raised relative flex flex-col', className)}>
      <Link
        href={`/services/${service.slug}`}
        className="flex flex-1 flex-col gap-5 p-7 outline-none lg:p-9"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <ServiceIcon name={service.icon} />
            {typeof index === 'number' ? (
              <Meta className="tabular font-sans text-[0.6875rem] font-semibold tracking-[0.14em]">
                {String(index + 1).padStart(2, '0')}
              </Meta>
            ) : null}
          </span>

          <ArrowRight
            aria-hidden="true"
            className="text-content-muted group-hover:text-brand size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>

        <Heading
          level={3}
          as="h3"
          className="group-hover:text-brand group-focus-visible:text-brand transition-colors"
        >
          {service.title}
        </Heading>

        <p className="text-content-primary text-[0.9375rem] leading-relaxed font-medium">
          {service.tagline}
        </p>

        <p className="text-content-secondary text-sm leading-relaxed">{service.businessNeed}</p>

        <span className="text-meta text-brand mt-auto pt-2 font-sans font-semibold tracking-[0.1em] uppercase">
          Explore this service
        </span>
      </Link>
    </article>
  );
}
