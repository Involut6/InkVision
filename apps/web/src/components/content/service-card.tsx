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

  return <Icon aria-hidden="true" className="text-accent-text size-5" />;
}

/**
 * A service card.
 *
 * Two densities. `compact` states the business need and nothing else, which is
 * what the homepage wants: four of these sit among six other sections, and the
 * job there is to get the right person to the right page.
 *
 * `full` is for the services overview, where the card has to do the work of a
 * brochure page: who the engagement is for, what it actually includes, and a
 * call to action in this service's own words. A visitor should be able to
 * self-select from this card without opening anything.
 *
 * The whole card is one link in both cases, so the target is large and
 * unambiguous. The CTA line is deliberately *not* a nested link: a link inside
 * a link is invalid HTML and gives screen-reader users two targets for one
 * destination.
 */
export function ServiceCard({
  service,
  index,
  variant = 'compact',
  className,
}: {
  service: ServiceSummaryDto;
  /** Ordinal shown as editorial numbering. */
  index?: number;
  variant?: 'compact' | 'full';
  className?: string;
}) {
  const isFull = variant === 'full';

  // The website and the API deploy as two independent projects, so a web
  // release can briefly be live against an older API that does not yet send
  // these fields. Treating them as optional costs one line and turns a 500 on
  // the whole services page into a card that renders slightly less detail.
  const deliverables = service.deliverables ?? [];

  // Four keeps every card the same height at the two-column breakpoint while
  // still showing enough to be useful. The detail page carries the full list.
  const shownDeliverables = isFull ? deliverables.slice(0, 4) : [];
  const remaining = isFull ? deliverables.length - shownDeliverables.length : 0;

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

        {isFull ? (
          <>
            {service.audience ? (
              <div className="border-border-subtle border-t pt-5">
                <Meta className="font-sans font-semibold">Who it is for</Meta>
                <p className="text-content-secondary mt-2 text-sm leading-relaxed">
                  {service.audience}
                </p>
              </div>
            ) : null}

            {shownDeliverables.length > 0 ? (
              <div>
                <Meta className="font-sans font-semibold">What it includes</Meta>
                <ul className="mt-3 flex flex-col gap-2">
                  {shownDeliverables.map((deliverable) => (
                    <li
                      key={deliverable}
                      className="text-content-secondary flex gap-2.5 text-sm leading-relaxed"
                    >
                      <span aria-hidden="true" className="text-accent-text mt-[0.45rem] leading-0">
                        &bull;
                      </span>
                      <span>{deliverable}</span>
                    </li>
                  ))}
                </ul>
                {remaining > 0 ? (
                  <p className="text-content-muted mt-3 text-sm">
                    and {remaining} more on the service page
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <span className="text-meta text-brand mt-auto flex items-center gap-2 pt-4 font-sans font-semibold tracking-[0.1em] uppercase">
          {service.ctaLabel ?? 'Explore this service'}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </span>
      </Link>
    </article>
  );
}
