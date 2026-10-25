import type { Metadata } from 'next';
import Link from 'next/link';

import { ServiceCard } from '@/components/content/service-card';
import { CardGrid, Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getApproachStages, getServices, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'Services',
    description:
      'Executive visibility, thought leadership and ghostwriting, strategic content and communications, and executive communications — four engagements for people and organisations with something valuable to say.',
    path: '/services',
    settings,
  });
}

export default async function ServicesPage() {
  const [services, approachStages] = await Promise.all([getServices(), getApproachStages()]);

  return (
    <>
      <PageHeader
        eyebrow="How we can help"
        title="Four engagements, four different problems."
        lead="Each of these addresses a distinct business need. If you are unsure which fits your situation, say what you are working towards and we will tell you plainly — including when the answer is a smaller piece of work than you expected."
        trail={[{ label: 'Services', href: '/services' }]}
        aside={
          <div className="border-border-accent border-l-2 pl-6">
            <Heading level={3} as="p">
              Not sure where to start?
            </Heading>
            <Body className="mt-3 text-sm">
              Most engagements begin with a conversation rather than a brief. Tell us the situation
              and we will suggest the right next step.
            </Body>
            <Button asChild className="mt-5">
              <Link href="/contact">Start a conversation</Link>
            </Button>
          </div>
        }
      />

      <Section labelledBy="services-list-heading">
        <h2 id="services-list-heading" className="sr-only">
          Our services
        </h2>

        {services.length > 0 ? (
          <CardGrid columns={2}>
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState
            title="Our service pages are being updated"
            description="They will be back shortly. In the meantime, get in touch and we will talk you through how we work."
            action={
              <Button asChild>
                <Link href="/contact">Start a conversation</Link>
              </Button>
            }
          />
        )}
      </Section>

      {approachStages.length > 0 ? (
        <Section tone="sunken" labelledBy="services-approach-heading">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <SectionHeader
              eyebrow="Common to every engagement"
              heading={<span id="services-approach-heading">The same five stages</span>}
              lead="Whichever service you engage us for, the work follows the same sequence. Your expertise and your approval stay central throughout."
            />

            <ol className="flex flex-col gap-6">
              {approachStages.map((stage, index) => (
                <li key={stage.id} className="border-border-subtle flex gap-5 border-t pt-5">
                  <span
                    aria-hidden="true"
                    className="tabular text-accent shrink-0 font-serif text-xl"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <Heading level={3} as="h3" className="text-[1.0625rem]">
                      {stage.title}
                    </Heading>
                    <p className="text-content-secondary mt-1.5 text-sm leading-relaxed">
                      {stage.summary}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-10">
            <Button asChild variant="outline">
              <Link href="/approach">Read the full approach</Link>
            </Button>
          </div>
        </Section>
      ) : null}

      {/* Engagement terms are enquiry-based: no fixed pricing or delivery
          guarantee was supplied, and inventing one would be worse than saying so. */}
      <Section labelledBy="engagement-heading">
        <SectionHeader
          eyebrow="Engagement"
          heading={<span id="engagement-heading">How engagements are scoped</span>}
          lead="We do not publish fixed packages. Scope, timeline and fees depend on what the work actually requires, and we would rather establish that in conversation than quote against a guess."
        />

        <div className="[&>*]:ring-border-subtle mt-10 grid gap-px sm:grid-cols-3 [&>*]:ring-1">
          {[
            {
              title: 'A conversation first',
              body: 'We start by understanding the situation, the audiences and what success would actually look like for you.',
            },
            {
              title: 'A proposal you can judge',
              body: 'You receive a written proposal setting out scope, deliverables, timeline and fees before any commitment is made.',
            },
            {
              title: 'One-off or ongoing',
              body: 'Some engagements are self-contained; others are programmes where consistency over time is the point. We will say which we think fits.',
            },
          ].map((item) => (
            <div key={item.title} className="bg-surface-raised p-7">
              <Heading level={3} as="h3" className="text-[1.0625rem]">
                {item.title}
              </Heading>
              <p className="text-content-secondary mt-3 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <ClosingCta />
    </>
  );
}
