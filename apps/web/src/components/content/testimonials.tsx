import { Quote } from 'lucide-react';

import { Meta } from '@/components/ui/typography';
import type { TestimonialDto } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * Approved testimonials.
 *
 * Renders nothing at all when the list is empty, which is the current state:
 * the API only returns quotes the business has confirmed are authorised for
 * publication, and an empty placeholder would be worse than no section. The
 * sample quotes in the strategy document are deliberately not seeded — see
 * README → "Outstanding business decisions".
 */
export function Testimonials({
  testimonials,
  className,
}: {
  testimonials: readonly TestimonialDto[];
  className?: string;
}) {
  if (testimonials.length === 0) return null;

  return (
    <ul
      className={cn('[&>*]:ring-border-subtle grid gap-px sm:grid-cols-2 [&>*]:ring-1', className)}
    >
      {testimonials.map((testimonial) => (
        <li key={testimonial.id} className="bg-surface-raised flex flex-col gap-5 p-8 lg:p-10">
          <Quote aria-hidden="true" className="text-accent size-5" />

          <blockquote className="text-content-primary font-serif text-[1.125rem] leading-relaxed">
            {testimonial.quote}
          </blockquote>

          <footer className="mt-auto">
            <Meta className="text-content-primary font-sans font-semibold">
              {testimonial.attributionName}
            </Meta>
            {testimonial.attributionRole || testimonial.attributionOrganisation ? (
              <Meta>
                {[testimonial.attributionRole, testimonial.attributionOrganisation]
                  .filter(Boolean)
                  .join(', ')}
              </Meta>
            ) : null}
          </footer>
        </li>
      ))}
    </ul>
  );
}
