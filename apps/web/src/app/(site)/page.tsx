import { ArrowRight, Compass, MessagesSquare, Scale, Target } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CaseStudyCard } from '@/components/content/case-study-card';
import { InsightCard } from '@/components/content/insight-card';
import { ResourceCard } from '@/components/content/resource-card';
import { ServiceCard } from '@/components/content/service-card';
import { Testimonials } from '@/components/content/testimonials';
import { ApproachStages } from '@/components/home/approach-stages';
import { Hero } from '@/components/home/hero';
import { CardGrid, Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Body, Heading, Lead, SectionHeader } from '@/components/ui/typography';
import {
  getApproachStages,
  getArticles,
  getCaseStudies,
  getProducts,
  getServices,
  getSiteSettings,
  getTestimonials,
} from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: `${settings.siteName} — ${settings.tagline}`,
    description: settings.supportingStatement,
    path: '/',
    settings,
  });
}

/**
 * The homepage.
 *
 * A server component throughout: every section is database-backed content that
 * is identical for every visitor, so there is nothing to fetch in the browser
 * and nothing to show a loading state for. The sections are fetched in parallel
 * rather than in sequence.
 */
export default async function HomePage() {
  const [settings, services, approachStages, caseStudies, articles, products, testimonials] =
    await Promise.all([
      getSiteSettings(),
      getServices(),
      getApproachStages(),
      getCaseStudies({ perPage: 3 }),
      getArticles({ perPage: 3 }),
      getProducts(),
      getTestimonials(),
    ]);

  const featuredProducts = products.filter((product) => product.status !== 'ARCHIVED').slice(0, 3);

  return (
    <>
      <Hero />

      {/* --- Expertise deserves to be understood ---------------------------- */}
      <Section tone="sunken" labelledBy="expertise-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <SectionHeader
            eyebrow="Why this matters"
            heading={<span id="expertise-heading">Expertise deserves to be understood</span>}
          />

          <div className="flex flex-col gap-6">
            <Lead>
              Valuable expertise is rarely hidden on purpose. It simply stays inside the
              organisation, the client relationship or the conversation where it was earned — while
              the people who would most benefit from it never encounter it at all.
            </Lead>

            <Body className="max-w-none">
              That gap has consequences. Credibility has to be rebuilt from scratch in every new
              room. Relationships depend on who already happens to know you. Opportunities are
              decided by people working from an incomplete picture, and reputation forms out of
              whatever was most recently visible rather than what you most want to be known for.
            </Body>

            <Body className="max-w-none">
              Thoughtful communication closes that gap. Not volume, and not self-promotion — a clear
              account of what you understand, made legible to the audiences for whom it matters.
              That is what supports credibility, deepens the right relationships and makes a
              reputation something you decide rather than something that happens to you.
            </Body>

            <ul className="mt-2 grid gap-5 sm:grid-cols-2">
              <ValueProposition
                icon={<Compass className="size-5" />}
                title="Strategy before content"
                body="Every engagement starts with a decision about what you want to be known for, not with a publishing schedule."
              />
              <ValueProposition
                icon={<MessagesSquare className="size-5" />}
                title="Voice over formula"
                body="We work from recorded conversation, so the writing starts from your own phrasing rather than a template."
              />
              <ValueProposition
                icon={<Scale className="size-5" />}
                title="Evidence over exaggeration"
                body="If a claim cannot be substantiated, we change the argument rather than reaching for a plausible figure."
              />
              <ValueProposition
                icon={<Target className="size-5" />}
                title="Visibility with a purpose"
                body="Presence is built where it serves a goal, and declined where it would only add noise."
              />
            </ul>
          </div>
        </div>
      </Section>

      {/* --- How we can help ------------------------------------------------ */}
      <Section labelledBy="services-heading">
        <SectionHeader
          eyebrow="How we can help"
          heading={<span id="services-heading">Four ways we work</span>}
          lead="Each engagement addresses a different business need. If you are not sure which fits, tell us what you are working towards and we will say so plainly."
        />

        {services.length > 0 ? (
          <CardGrid columns={2} className="mt-12">
            {services.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState
            className="mt-12"
            title="Services are being updated"
            description="Our service pages are temporarily unavailable. Please get in touch and we will talk you through how we can help."
            action={
              <Button asChild>
                <Link href="/contact">Start a conversation</Link>
              </Button>
            }
          />
        )}
      </Section>

      {/* --- Our approach --------------------------------------------------- */}
      <Section tone="sunken" labelledBy="approach-heading">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <SectionHeader
            className="lg:max-w-[26rem]"
            eyebrow="Our approach"
            heading={<span id="approach-heading">Five stages, in order</span>}
            lead="The sequence matters. Each stage depends on the one before it, and your expertise and approval stay central throughout."
          />

          <Button asChild variant="outline" className="shrink-0">
            <Link href="/approach">
              See the full approach
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {approachStages.length > 0 ? (
          <ApproachStages stages={approachStages} className="mt-10" showClientRole={false} />
        ) : null}
      </Section>

      {/* --- Selected work -------------------------------------------------- */}
      <Section labelledBy="work-heading">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <SectionHeader
            className="lg:max-w-[32rem]"
            eyebrow="Selected work"
            heading={<span id="work-heading">Work, clearly labelled</span>}
            lead="Commissioned client work appears here only where the client has approved its publication. Illustrative samples are labelled as such, so nothing is mistaken for something it is not."
          />

          {caseStudies.data.length > 0 ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/work">
                View all work
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        {caseStudies.data.length > 0 ? (
          <CardGrid className="mt-12">
            {caseStudies.data.map((caseStudy) => (
              <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} />
            ))}
          </CardGrid>
        ) : (
          // A considered empty state rather than fabricated projects. Much of
          // this studio's work is confidential, which is itself worth saying.
          <EmptyState
            className="mt-12"
            title="Our portfolio is being prepared"
            description="A good deal of our work is confidential, and published case studies are added only once the client has approved them. If you would like to discuss relevant experience, we are glad to talk it through directly."
            action={
              <Button asChild>
                <Link href="/contact">Ask about relevant work</Link>
              </Button>
            }
          />
        )}
      </Section>

      {/* --- Insights ------------------------------------------------------- */}
      <Section tone="sunken" labelledBy="insights-heading">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <SectionHeader
            className="lg:max-w-[32rem]"
            eyebrow="Insights"
            heading={<span id="insights-heading">Writing on making expertise visible</span>}
            lead="Occasional, considered pieces on positioning, thought leadership and the communications that carry weight."
          />

          {articles.data.length > 0 ? (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/insights">
                Read all insights
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        {articles.data.length > 0 ? (
          <CardGrid className="mt-12">
            {articles.data.map((article) => (
              <InsightCard key={article.id} article={article} />
            ))}
          </CardGrid>
        ) : (
          <EmptyState
            className="mt-12"
            title="Our first pieces are in preparation"
            description="We are writing rather than publishing placeholders. Subscribe below and we will let you know when the first articles are out."
            action={
              <Button asChild variant="outline">
                <Link href="/insights">See the editorial themes</Link>
              </Button>
            }
          />
        )}
      </Section>

      {/* --- Resources ------------------------------------------------------ */}
      {featuredProducts.length > 0 ? (
        <Section labelledBy="resources-heading">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
            <SectionHeader
              className="lg:max-w-[32rem]"
              eyebrow="Resources"
              heading={<span id="resources-heading">Practical tools you can use alone</span>}
              lead="Structured workbooks that take the same approach we use in client engagements, in a form you can work through yourself."
            />

            <Button asChild variant="outline" className="shrink-0">
              <Link href="/resources">
                Browse resources
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <CardGrid className="mt-12">
            {featuredProducts.map((product) => (
              <ResourceCard key={product.id} product={product} />
            ))}
          </CardGrid>
        </Section>
      ) : null}

      {/* --- Testimonials ---------------------------------------------------
          Renders only when the business has approved specific quotes for
          publication. Nothing is shown otherwise. */}
      {testimonials.length > 0 ? (
        <Section tone="sunken" labelledBy="testimonials-heading">
          <SectionHeader
            eyebrow="In their words"
            heading={<span id="testimonials-heading">What clients say</span>}
          />
          <Testimonials testimonials={testimonials} className="mt-12" />
        </Section>
      ) : null}

      <ClosingCta />

      {/* Keeps the settings fetch meaningful for the metadata above and makes
          the newsletter state explicit on the page. */}
      {settings.newsletterEnabled ? null : null}
    </>
  );
}

function ValueProposition({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="border-border-subtle flex flex-col gap-2 border-t pt-5">
      <span aria-hidden="true" className="text-accent">
        {icon}
      </span>
      <Heading level={3} as="h3" className="text-[1.0625rem]">
        {title}
      </Heading>
      <p className="text-content-secondary text-sm leading-relaxed">{body}</p>
    </li>
  );
}
