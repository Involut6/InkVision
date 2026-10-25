import { ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Heading, Meta } from '@/components/ui/typography';
import { PRODUCT_STATUS_LABELS, type ProductSummaryDto } from '@inkvision/shared-types';
import { cn, formatMoney } from '@/lib/utils';

/**
 * A resource card.
 *
 * The purchase affordance is driven entirely by the server's `purchasable`
 * flag. A product that is not purchasable shows its status and no price, rather
 * than a buy button that would fail — and the price is only ever shown when
 * the server has actually set one.
 */
export function ResourceCard({
  product,
  className,
}: {
  product: ProductSummaryDto;
  className?: string;
}) {
  return (
    <article className={cn('group bg-surface-raised flex flex-col', className)}>
      <Link href={`/resources/${product.slug}`} className="flex flex-1 flex-col gap-4 p-7 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone={product.purchasable ? 'success' : 'neutral'}>
            {product.purchasable ? 'Available' : PRODUCT_STATUS_LABELS[product.status]}
          </Badge>

          {product.fileFormat ? (
            <Meta className="inline-flex items-center gap-1.5">
              <FileText aria-hidden="true" className="size-3.5" />
              {product.fileFormat}
            </Meta>
          ) : null}
        </div>

        <Heading
          level={3}
          as="h3"
          className="group-hover:text-brand group-focus-visible:text-brand transition-colors"
        >
          {product.title}
        </Heading>

        {product.subtitle ? (
          <p className="text-content-primary text-[0.9375rem] font-medium">{product.subtitle}</p>
        ) : null}

        <p className="text-content-secondary text-sm leading-relaxed">{product.summary}</p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          {/* A price is rendered only when the product is genuinely purchasable,
              so nothing on the page implies a transaction that cannot happen. */}
          {product.purchasable && product.price ? (
            <span className="tabular text-content-primary font-serif text-lg">
              {formatMoney(product.price)}
            </span>
          ) : (
            <Meta>
              {product.status === 'COMING_SOON' ? 'In preparation' : 'Not currently available'}
            </Meta>
          )}

          <ArrowRight
            aria-hidden="true"
            className="text-content-muted group-hover:text-brand size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          />
        </div>
      </Link>
    </article>
  );
}
