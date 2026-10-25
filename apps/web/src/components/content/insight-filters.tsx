import Link from 'next/link';

import type { ArticleCategoryDto } from '@inkvision/shared-types';
import { cn } from '@/lib/utils';

/**
 * Category filters.
 *
 * Plain links rather than a JavaScript filter, so each filtered view has its
 * own URL that can be shared, bookmarked and crawled.
 */
export function InsightFilters({
  categories,
  activeCategory,
  search,
  className,
}: {
  categories: readonly ArticleCategoryDto[];
  activeCategory?: string;
  search?: string;
  className?: string;
}) {
  if (categories.length === 0) return null;

  const hrefFor = (category?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    const query = params.toString();
    return query ? `/insights?${query}` : '/insights';
  };

  return (
    <nav aria-label="Filter by category" className={className}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterLink href={hrefFor()} active={!activeCategory}>
            All
          </FilterLink>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <FilterLink href={hrefFor(category.slug)} active={activeCategory === category.slug}>
              {category.name}
              {typeof category.articleCount === 'number' ? (
                <span className="tabular ml-1.5 opacity-60">{category.articleCount}</span>
              ) : null}
            </FilterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-9 items-center border px-3.5 text-[0.8125rem] font-medium transition-colors',
        active
          ? 'border-brand bg-brand text-content-inverse'
          : 'border-border-subtle bg-surface-raised text-content-secondary hover:border-brand hover:text-brand',
      )}
    >
      {children}
    </Link>
  );
}
