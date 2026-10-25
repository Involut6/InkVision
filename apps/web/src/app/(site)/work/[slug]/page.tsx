import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/ui/rich-text';
import { Heading, Meta, SectionHeader } from '@/components/ui/typography';
import { getCaseStudies, getCaseStudy, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { formatDate, isoDate } from '@/lib/utils';
import { WORK_KIND_LABELS } from '@inkvision/shared-types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const caseStudies = await getCaseStudies({ perPage: 50 });
  return caseStudies.data.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [caseStudy, settings] = await Promise.all([getCaseStudy(slug), getSiteSettings()]);

  if (!caseStudy) {
    return { title: 'Case study not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: caseStudy.seoTitle ?? caseStudy.title,
    description: caseStudy.seoDescription ?? caseStudy.summary,
    path: `/work/${caseStudy.slug}`,
    settings,
    image: caseStudy.coverImage,
    noIndex: caseStudy.noIndex ?? false,
  });
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const caseStudy = await getCaseStudy(slug);

  if (!caseStudy) notFound();

  const isIllustrative = caseStudy.kind !== 'COMMISSIONED';

  return (
    <>
      <PageHeader
        eyebrow={caseStudy.category?.name ?? 'Selected work'}
        title={caseStudy.title}
        lead={caseStudy.summary}
        trail={[
          { label: 'Selected Work', href: '/work' },
          { label: caseStudy.title, href: `/work/${caseStudy.slug}` },
        ]}
        aside={
          <dl className="border-border-accent flex flex-col gap-4 border-l-2 pl-6">
            <div>
              <dt>
                <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  Type of work
                </Meta>
              </dt>
              <dd className="mt-1.5">
                <Badge tone={isIllustrative ? 'neutral' : 'brand'}>
                  {WORK_KIND_LABELS[caseStudy.kind]}
                </Badge>
              </dd>
            </div>

            {caseStudy.clientName || caseStudy.industry ? (
              <div>
                <dt>
                  <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                    {caseStudy.clientName ? 'Client' : 'Sector'}
                  </Meta>
                </dt>
                <dd className="text-content-primary mt-1 text-sm">
                  {caseStudy.clientName ?? caseStudy.industry}
                </dd>
              </div>
            ) : null}

            {caseStudy.publishedAt ? (
              <div>
                <dt>
                  <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                    Published
                  </Meta>
                </dt>
                <dd className="text-content-primary mt-1 text-sm">
                  <time dateTime={isoDate(caseStudy.publishedAt)}>
                    {formatDate(caseStudy.publishedAt)}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>
        }
      />

      {/* An unmissable notice on illustrative work. A small badge alone is too
          easy to miss, and mistaking a sample for client work is the single
          most damaging misreading this page could invite. */}
      {isIllustrative ? (
        <div className="border-border-subtle bg-accent-soft border-b">
          <div className="page-shell py-4">
            <p className="text-gold-700 text-sm">
              <strong className="font-semibold">
                {caseStudy.kind === 'SAMPLE' ? 'Illustrative sample.' : 'Strategic concept.'}
              </strong>{' '}
              This is our own work, created to demonstrate approach and standard. It does not
              represent a commissioned client engagement.
            </p>
          </div>
        </div>
      ) : null}

      <Section labelledBy="challenge-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="The challenge"
            heading={<span id="challenge-heading">The communication problem</span>}
          />
          <RichText html={caseStudy.challenge.html} />
        </div>
      </Section>

      <Section tone="sunken" labelledBy="objective-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="The objective"
            heading={<span id="objective-heading">What the work had to achieve</span>}
          />
          <div className="flex flex-col gap-8">
            <RichText html={caseStudy.objective.html} />

            {caseStudy.strategicQuestion ? (
              <blockquote className="border-border-accent border-l-2 pl-6">
                <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                  The strategic question
                </Meta>
                <p className="text-content-primary mt-2 font-serif text-xl leading-snug">
                  {caseStudy.strategicQuestion}
                </p>
              </blockquote>
            ) : null}
          </div>
        </div>
      </Section>

      <Section labelledBy="approach-heading">
        <SectionHeader
          eyebrow="How we worked"
          heading={<span id="approach-heading">Research and editorial approach</span>}
        />

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Heading level={3} as="h3" className="text-[1.0625rem]">
              Research
            </Heading>
            <RichText html={caseStudy.researchApproach.html} className="mt-4" />
          </div>
          <div>
            <Heading level={3} as="h3" className="text-[1.0625rem]">
              Editorial
            </Heading>
            <RichText html={caseStudy.editorialApproach.html} className="mt-4" />
          </div>
        </div>
      </Section>

      {caseStudy.deliverables.length > 0 || caseStudy.excerpts.length > 0 ? (
        <Section tone="sunken" labelledBy="deliverables-heading">
          <SectionHeader
            eyebrow="The work itself"
            heading={<span id="deliverables-heading">Deliverables and excerpts</span>}
          />

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] lg:gap-16">
            {caseStudy.deliverables.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {caseStudy.deliverables.map((deliverable) => (
                  <li key={deliverable} className="border-border-subtle flex gap-3 border-t pt-3">
                    <Check aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
                    <span className="text-content-secondary text-[0.9375rem] leading-relaxed">
                      {deliverable}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {caseStudy.excerpts.length > 0 ? (
              <div className="flex flex-col gap-8">
                {caseStudy.excerpts.map((excerpt) => (
                  <figure
                    key={excerpt.id}
                    className="bg-surface-raised ring-border-subtle p-7 ring-1"
                  >
                    <figcaption>
                      <Meta className="font-sans text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                        {excerpt.label}
                      </Meta>
                    </figcaption>
                    <blockquote className="text-content-primary mt-3 font-serif text-[1.0625rem] leading-relaxed whitespace-pre-line">
                      {excerpt.body}
                    </blockquote>
                  </figure>
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* Outcomes appear only where the API has confirmed they are verified —
          and, for client work, approved. */}
      {caseStudy.outcomes.length > 0 ? (
        <Section labelledBy="outcomes-heading">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <SectionHeader
              eyebrow="Outcomes"
              heading={<span id="outcomes-heading">What followed</span>}
              lead={
                caseStudy.outcomesVerified
                  ? 'These outcomes have been verified with the client and approved for publication.'
                  : undefined
              }
            />
            <ul className="flex flex-col gap-4">
              {caseStudy.outcomes.map((outcome) => (
                <li key={outcome} className="border-border-subtle flex gap-3 border-t pt-4">
                  <Check aria-hidden="true" className="text-accent mt-1 size-4 shrink-0" />
                  <span className="text-content-secondary text-[0.9375rem] leading-relaxed">
                    {outcome}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {caseStudy.relatedServices.length > 0 ? (
        <Section tone="sunken" labelledBy="related-services-heading">
          <SectionHeader
            eyebrow="Related"
            heading={<span id="related-services-heading">Services behind this work</span>}
          />
          <ul className="mt-8 flex flex-wrap gap-3">
            {caseStudy.relatedServices.map((service) => (
              <li key={service.id}>
                <Button asChild variant="outline">
                  <Link href={`/services/${service.slug}`}>{service.title}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <ClosingCta />
    </>
  );
}
