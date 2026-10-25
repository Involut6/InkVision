import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { InsightCard } from '@/components/content/insight-card';
import { InsightFilters } from '@/components/content/insight-filters';
import { InsightSearch } from '@/components/content/insight-search';
import { CardGrid, Section } from '@/components/home/section';
import { NewsletterForm } from '@/components/site/newsletter-form';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { CardSkeleton, EmptyState } from '@/components/ui/states';
import { Eyebrow, Heading, SectionHeader } from '@/components/ui/typography';
import { getArticleCategories, getArticles, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

const PER_PAGE = 9;

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [{ category, search, page }, settings] = await Promise.all([
    searchParams,
    getSiteSettings(),
  ]);

  const title = search ? `Insights — results for “${search}”` : category ? 'Insights' : 'Insights';

  return buildMetadata({
    title,
    description:
      'Writing on executive visibility, thought leadership, business communication, content strategy and professional brand.',
    path: '/insights',
    settings,
    // Filtered and paged views are not canonical: they would compete with the
    // unfiltered listing for the same content.
    noIndex: Boolean(search) || Boolean(category) || (page !== undefined && page !== '1'),
  });
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? '1', 10);

  const [articles, categories] = await Promise.all([
    getArticles({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      perPage: PER_PAGE,
      ...(params.category ? { category: params.category } : {}),
      ...(params.search ? { search: params.search } : {}),
    }),
    getArticleCategories(),
  ]);

  const isFiltered = Boolean(params.category || params.search);
  const activeCategory = categories.find((category) => category.slug === params.category);

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Writing on making expertise visible."
        lead="Considered pieces on positioning, thought leadership, and the communications that carry weight. Published when we have something worth your time, not on a schedule."
        trail={[{ label: 'Insights', href: '/insights' }]}
      />

      <Section labelledBy="insights-list-heading">
        <h2 id="insights-list-heading" className="sr-only">
          {activeCategory ? `${activeCategory.name} articles` : 'All articles'}
        </h2>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <InsightFilters
            categories={categories}
            activeCategory={params.category}
            search={params.search}
            className="order-2 lg:order-1"
          />

          <Suspense fallback={<div className="h-11 lg:w-80" />}>
            <InsightSearch className="order-1 lg:order-2 lg:w-80 lg:shrink-0" />
          </Suspense>
        </div>

        {params.search ? (
          <p
            // Announced so a screen-reader user learns the result count after
            // the navigation, not only on visual inspection.
            aria-live="polite"
            className="text-content-secondary mt-6 text-sm"
          >
            {articles.meta.total === 0
              ? `No articles match “${params.search}”.`
              : `${articles.meta.total} ${articles.meta.total === 1 ? 'article matches' : 'articles match'} “${params.search}”.`}
          </p>
        ) : null}

        <Suspense fallback={<CardSkeleton count={6} />}>
          {articles.data.length > 0 ? (
            <>
              <CardGrid className="mt-10">
                {articles.data.map((article) => (
                  <InsightCard key={article.id} article={article} />
                ))}
              </CardGrid>

              <Pagination
                meta={articles.meta}
                basePath="/insights"
                searchParams={{ category: params.category, search: params.search }}
                className="mt-12"
              />
            </>
          ) : isFiltered ? (
            <EmptyState
              className="mt-10"
              title="Nothing matches that yet"
              description="Try a different category or search term, or browse everything we have published."
              action={
                <Button asChild variant="outline">
                  <Link href="/insights">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            // The honest state today: pieces are commissioned and in progress,
            // and nothing is published that has not actually been written.
            <EmptyState
              className="mt-10"
              title="Our first pieces are in preparation"
              description="We are writing rather than publishing placeholders. The themes below are what we are working on; subscribe and we will let you know when the first articles are out."
            />
          )}
        </Suspense>
      </Section>

      {/* --- Editorial themes ------------------------------------------------
          Shown as the subjects we write about, deliberately phrased so they
          are not mistaken for existing articles. */}
      {categories.length > 0 ? (
        <Section tone="sunken" labelledBy="themes-heading">
          <SectionHeader
            eyebrow="Editorial themes"
            heading={<span id="themes-heading">What we write about</span>}
            lead="Six areas, each chosen because it is where the questions we are actually asked tend to cluster."
          />

          <div className="[&>*]:ring-border-subtle mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3 [&>*]:ring-1">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/insights?category=${category.slug}`}
                className="group bg-surface-raised hover:bg-surface flex flex-col gap-3 p-7 transition-colors"
              >
                <Eyebrow>
                  {typeof category.articleCount === 'number' && category.articleCount > 0
                    ? `${category.articleCount} published`
                    : 'In preparation'}
                </Eyebrow>
                <Heading level={3} as="h3" className="group-hover:text-brand text-[1.0625rem]">
                  {category.name}
                </Heading>
                {category.description ? (
                  <p className="text-content-secondary text-sm leading-relaxed">
                    {category.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <Section labelledBy="insights-newsletter-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <SectionHeader
            eyebrow="Stay in touch"
            heading={<span id="insights-newsletter-heading">New writing, when there is some</span>}
            lead="Occasional emails. No cadence promised, because a schedule is how writing becomes filler."
          />
          <div className="lg:pt-6">
            <NewsletterForm source="insights" />
          </div>
        </div>
      </Section>
    </>
  );
}
