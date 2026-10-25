import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { JsonLd } from '@/components/json-ld';
import { breadcrumbJsonLd } from '@/lib/metadata';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Breadcrumb trail.
 *
 * The final entry is rendered as plain text with `aria-current="page"` rather
 * than a link to the page you are already on, and the same trail is emitted as
 * structured data for search engines.
 */
export function Breadcrumbs({ trail, className }: { trail: readonly Crumb[]; className?: string }) {
  if (trail.length === 0) return null;

  const full = [{ label: 'Home', href: '/' }, ...trail];

  return (
    <>
      <nav aria-label="Breadcrumb" className={cn('text-meta', className)}>
        <ol className="text-content-muted flex flex-wrap items-center gap-1.5">
          {full.map((crumb, index) => {
            const isLast = index === full.length - 1;

            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight aria-hidden="true" className="size-3 shrink-0 opacity-50" />
                ) : null}

                {isLast ? (
                  <span aria-current="page" className="text-content-secondary">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="hover:text-brand underline-offset-4 transition-colors hover:underline"
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <JsonLd data={breadcrumbJsonLd(full)} />
    </>
  );
}
