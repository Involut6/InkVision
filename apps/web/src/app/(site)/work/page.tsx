import type { Metadata } from 'next';
import Link from 'next/link';

import { CaseStudyCard } from '@/components/content/case-study-card';
import { CardGrid, Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getCaseStudies, getPortfolioCategories, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { cn } from '@/lib/utils';
import { WORK_KINDS, WORK_KIND_LABELS } from '@inkvision/shared-types';

const PER_PAGE = 9;

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; kind?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const [params, settings] = await Promise.all([searchParams, getSiteSettings()]);

  return buildMetadata({
    title: 'Selected Work',
    description:
      'Case studies, writing samples and strategic concepts from InkVision Creatives. Commissioned client work appears only where the client has approved publication.',
    path: '/work',
    settings,
    noIndex:
      Boolean(params.category || params.kind) || (params.page !== undefined && params.page !== '1'),
  });
}

export default async function WorkPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? '1', 10);

  const [caseStudies, categories] = await Promise.all([
    getCaseStudies({
      page: Number.isFinite(page) && page > 0 ? page : 1,
      perPage: PER_PAGE,
      ...(params.category ? { category: params.category } : {}),
      ...(params.kind ? { kind: params.kind } : {}),
    }),
    getPortfolioCategories(),
  ]);

  const isFiltered = Boolean(params.category || params.kind);

  return (
    <>
      <PageHeader
        eyebrow="Selected work"
        title="Work, clearly labelled."
        lead="Much of what we do is confidential, and a great deal of it is published under someone else’s name. What appears here is either client work we have been given permission to show, or our own illustrative samples — and each is labelled so the two are never confused."
        trail={[{ label: 'Selected Work', href: '/work' }]}
      />

      {/* --- How the labels work --------------------------------------------
          Stated up front rather than in small print: the distinction between
          commissioned work and illustrative samples is the point. */}
      <Section tone="sunken" labelledBy="labels-heading">
        <SectionHeader
          eyebrow="Reading this page"
          heading={<span id="labels-heading">What each label means</span>}
        />

        <dl className="[&>*]:ring-border-subtle mt-10 grid gap-px sm:grid-cols-3 [&>*]:ring-1">
          {[
            {
              kind: 'COMMISSIONED' as const,
              body: 'Real client work, published only with the client’s written approval. Where outcomes are shown, they have been verified.',
            },
            {
              kind: 'SAMPLE' as const,
              body: 'Our own writing, created to demonstrate approach and standard. It represents no client engagement and is never presented as one.',
            },
            {
              kind: 'CONCEPT' as const,
              body: 'A strategic exercise — a position, an argument or an editorial plan worked through to show how we think.',
            },
          ].map((item) => (
            <div key={item.kind} className="bg-surface-raised p-7">
              <dt>
                <Heading level={3} as="h3" className="text-[1.0625rem]">
                  {WORK_KIND_LABELS[item.kind]}
                </Heading>
              </dt>
              <dd className="text-content-secondary mt-3 text-sm leading-relaxed">{item.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section labelledBy="work-list-heading">
        <h2 id="work-list-heading" className="sr-only">
          Published work
        </h2>

        {categories.length > 0 || caseStudies.meta.total > 0 ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
            <FilterGroup
              label="Category"
              options={[
                { value: undefined, label: 'All' },
                ...categories.map((category) => ({
                  value: category.slug,
                  label: category.name,
                })),
              ]}
              active={params.category}
              paramName="category"
              otherParams={{ kind: params.kind }}
            />

            <FilterGroup
              label="Type"
              options={[
                { value: undefined, label: 'All' },
                ...WORK_KINDS.map((kind) => ({ value: kind, label: WORK_KIND_LABELS[kind] })),
              ]}
              active={params.kind}
              paramName="kind"
              otherParams={{ category: params.category }}
            />
          </div>
        ) : null}

        {caseStudies.data.length > 0 ? (
          <>
            <CardGrid className="mt-10">
              {caseStudies.data.map((caseStudy) => (
                <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
              ))}
            </CardGrid>

            <Pagination
              meta={caseStudies.meta}
              basePath="/work"
              searchParams={{ category: params.category, kind: params.kind }}
              className="mt-12"
            />
          </>
        ) : isFiltered ? (
          <EmptyState
            className="mt-10"
            title="Nothing in that selection yet"
            description="Try another category or type, or view everything we have published."
            action={
              <Button asChild variant="outline">
                <Link href="/work">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          // The honest state: no completed, client-approved work has been
          // supplied, and fabricating a portfolio is exactly what we will not do.
          <EmptyState
            className="mt-10"
            title="Our portfolio is being prepared"
            description="Published case studies are added only once the client has approved them, and much of our work is confidential by its nature. If you would like to understand our experience in a particular area, we are glad to talk it through directly."
            action={
              <Button asChild>
                <Link href="/contact">Ask about relevant work</Link>
              </Button>
            }
          />
        )}
      </Section>

      <Section tone="sunken" labelledBy="confidentiality-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeader
            eyebrow="A note on confidentiality"
            heading={<span id="confidentiality-heading">Why you may not see much here</span>}
          />
          <div className="flex flex-col gap-5">
            <Body className="max-w-none">
              Ghostwriting means the work appears under the client’s name. Executive communications
              routinely involve material that is not public and in many cases never becomes public.
              Positioning work is visible only as the client’s own presence.
            </Body>
            <Body className="max-w-none">
              We could fill this page with plausible-looking projects. We would rather it stayed
              thin and true — and talk you through relevant experience directly, within whatever
              confidentiality our clients are owed.
            </Body>
          </div>
        </div>
      </Section>

      <ClosingCta />
    </>
  );
}

function FilterGroup({
  label,
  options,
  active,
  paramName,
  otherParams,
}: {
  label: string;
  options: readonly { value: string | undefined; label: string }[];
  active?: string;
  paramName: string;
  otherParams: Record<string, string | undefined>;
}) {
  const hrefFor = (value?: string) => {
    const params = new URLSearchParams();
    for (const [key, entry] of Object.entries(otherParams)) {
      if (entry) params.set(key, entry);
    }
    if (value) params.set(paramName, value);
    const query = params.toString();
    return query ? `/work?${query}` : '/work';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-meta text-content-muted font-semibold tracking-[0.1em] uppercase">
        {label}
      </span>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = (option.value ?? undefined) === (active ?? undefined);
          return (
            <li key={option.label}>
              <Link
                href={hrefFor(option.value)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'inline-flex h-9 items-center border px-3.5 text-[0.8125rem] font-medium transition-colors',
                  isActive
                    ? 'border-brand bg-brand text-content-inverse'
                    : 'border-border-subtle bg-surface-raised text-content-secondary hover:border-brand hover:text-brand',
                )}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
