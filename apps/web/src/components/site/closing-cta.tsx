import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

/**
 * The closing call to action.
 *
 * One component, used at the foot of every substantive page, so the invitation
 * to start a conversation is consistent and the copy lives in one place.
 */
export function ClosingCta({
  headline = 'What do you want to be known for?',
  body = 'Tell us what you are working towards. We will help you identify the right next step, whether that is a clearer executive position, a thought leadership programme or a more coherent content strategy.',
  actionLabel = 'Start a conversation',
  actionHref = '/contact',
  className,
}: {
  headline?: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="closing-cta-heading"
      className={cn('bg-surface-inverse text-white', className)}
    >
      <div className="page-shell py-16 sm:py-20 lg:py-24">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-16">
          <div className="flex flex-col gap-5">
            <span aria-hidden="true" className="border-accent block h-0 w-10 border-t-2" />

            <Heading id="closing-cta-heading" level={1} as="h2" className="text-white">
              {headline}
            </Heading>

            <p className="text-lead max-w-[40rem] text-white/70">{body}</p>
          </div>

          <div className="flex lg:justify-end">
            <Button asChild variant="accent" size="lg">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
