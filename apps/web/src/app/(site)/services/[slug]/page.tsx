import { Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CaseStudyCard } from '@/components/content/case-study-card';
import { InsightCard } from '@/components/content/insight-card';
import { CardGrid, Section } from '@/components/home/section';
import { JsonLd } from '@/components/json-ld';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { FaqAccordion } from '@/components/ui/faq-accordion';
import { RichText } from '@/components/ui/rich-text';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getService, getServices, getSiteSettings } from '@/lib/content';
import { absoluteUrl } from '@/lib/env';
import { buildMetadata, faqJsonLd } from '@/lib/metadata';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Pre-renders the four service pages at build time. The set is small and
 * changes rarely, so there is no reason to render them on demand.
 */
export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [service, settings] = await Promise.all([getService(slug), getSiteSettings()]);

  if (!service) {
    return { title: 'Service not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: service.seoTitle ?? service.title,
    description: service.seoDescription ?? service.tagline,
    path: `/services/${service.slug}`,
    settings,
    image: service.ogImage ?? null,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) notFound();

  return (
    <>
      <PageHeader
        eyebrow={service.title}
        title={service.tagline}
        lead={service.businessNeed}
        trail={[
          { label: 'Services', href: '/services' },
          { label: service.title, href: `/services/${service.slug}` },
        ]}
        aside={
          <div className="border-border-accent border-l-2 pl-6">
            <Heading level={3} as="p" className="text-[1.0625rem]">
              Who this is for
            </Heading>
            <Body className="mt-3 text-sm">{service.audience}</Body>
          </div>
        }
      />

      {/* --- The problem ---------------------------------------------------- */}
      <Section labelledBy="problem-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="The problem"
            heading={<span id="problem-heading">What this addresses</span>}
          />
          <RichText html={service.problem.html} />
        </div>
      </Section>

      {/* --- The approach --------------------------------------------------- */}
      <Section tone="sunken" labelledBy="approach-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHeader
            eyebrow="Our approach"
            heading={<span id="approach-heading">How we work on it</span>}
          />
          <RichText html={service.approach.html} />
        </div>
      </Section>

      {/* --- Components ----------------------------------------------------- */}
      {service.components.length > 0 ? (
        <Section labelledBy="components-heading">
          <SectionHeader
            eyebrow="What is involved"
            heading={<span id="components-heading">Service components</span>}
            lead="Not every engagement includes all of these. Scope is agreed against what the situation actually needs."
          />

          <div className="[&>*]:ring-border-subtle mt-12 grid gap-px sm:grid-cols-2 [&>*]:ring-1">
            {service.components.map((component, index) => (
              <div key={component.id} className="bg-surface-raised flex flex-col gap-3 p-7 lg:p-8">
                <span aria-hidden="true" className="tabular text-accent font-serif text-lg">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Heading level={3} as="h3" className="text-[1.0625rem]">
                  {component.title}
                </Heading>
                <p className="text-content-secondary text-sm leading-relaxed">
                  {component.description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* --- Deliverables and process --------------------------------------- */}
      <Section tone="sunken" labelledBy="deliverables-heading">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {service.deliverables.length > 0 ? (
            <div>
              <SectionHeader
                eyebrow="Deliverables"
                heading={<span id="deliverables-heading">What you receive</span>}
              />
              <ul className="mt-8 flex flex-col gap-3">
                {service.deliverables.map((deliverable) => (
                  <li key={deliverable} className="border-border-subtle flex gap-3 border-t pt-3">
                    <Check aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
                    <span className="text-content-secondary text-[0.9375rem] leading-relaxed">
                      {deliverable}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {service.engagementProcess.length > 0 ? (
            <div>
              <SectionHeader eyebrow="The engagement" heading="How it runs" />
              <ol className="mt-8 flex flex-col gap-6">
                {service.engagementProcess.map((stage, index) => (
                  <li key={stage.id} className="border-border-subtle border-t pt-4">
                    <div className="flex items-baseline gap-3">
                      <span aria-hidden="true" className="tabular text-accent font-serif text-base">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Heading level={3} as="h3" className="text-[1.0625rem]">
                        {stage.title}
                      </Heading>
                    </div>
                    <p className="text-content-secondary mt-2 text-sm leading-relaxed">
                      {stage.summary}
                    </p>
                    <p className="text-content-muted mt-2 text-sm leading-relaxed">
                      {stage.detail}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      </Section>

      {/* --- Related published samples --------------------------------------
          Only genuinely published work appears here. Empty is the honest
          result where none exists yet. */}
      {service.relatedCaseStudies.length > 0 ? (
        <Section labelledBy="related-work-heading">
          <SectionHeader
            eyebrow="Related work"
            heading={<span id="related-work-heading">Work in this area</span>}
          />
          <CardGrid className="mt-12">
            {service.relatedCaseStudies.map((caseStudy) => (
              <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {service.relatedArticles.length > 0 ? (
        <Section tone="sunken" labelledBy="related-articles-heading">
          <SectionHeader
            eyebrow="Related reading"
            heading={<span id="related-articles-heading">Writing on this</span>}
          />
          <CardGrid className="mt-12">
            {service.relatedArticles.map((article) => (
              <InsightCard key={article.id} article={article} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* --- FAQs ------------------------------------------------------------ */}
      {service.faqs.length > 0 ? (
        <Section labelledBy="service-faq-heading">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <SectionHeader
              eyebrow="Questions"
              heading={<span id="service-faq-heading">Common questions</span>}
            />
            <div>
              <FaqAccordion items={service.faqs} />
              <p className="text-content-muted mt-8 text-sm">
                Something not covered here?{' '}
                <Link
                  href="/contact"
                  className="text-brand underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  Ask us directly
                </Link>
                .
              </p>
            </div>
          </div>

          <JsonLd
            data={faqJsonLd(
              service.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
            )}
          />
        </Section>
      ) : null}

      <ClosingCta headline={service.ctaHeadline} body={service.ctaBody} />

      {/* Service structured data, limited to facts we actually hold: no price,
          no rating, no review count. */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: service.title,
          serviceType: service.title,
          description: service.businessNeed,
          url: absoluteUrl(`/services/${service.slug}`),
          provider: { '@type': 'Organization', name: 'InkVision Creatives' },
          audience: { '@type': 'Audience', audienceType: service.audience },
        }}
      />
    </>
  );
}
