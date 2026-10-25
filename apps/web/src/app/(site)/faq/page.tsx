import type { Metadata } from 'next';
import Link from 'next/link';

import { Section } from '@/components/home/section';
import { JsonLd } from '@/components/json-ld';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { FaqAccordion } from '@/components/ui/faq-accordion';
import { EmptyState } from '@/components/ui/states';
import { Heading } from '@/components/ui/typography';
import { getFaqGroups, getSiteSettings } from '@/lib/content';
import { buildMetadata, faqJsonLd } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'Frequently Asked Questions',
    description:
      'Who we work with, how voice-conscious writing works, what outcomes to expect, confidentiality and approval, and how digital resources are delivered.',
    path: '/faq',
    settings,
  });
}

export default async function FaqPage() {
  const groups = await getFaqGroups();
  const allItems = groups.flatMap((group) => group.items);

  return (
    <>
      <PageHeader
        eyebrow="Frequently asked questions"
        title="The questions we are actually asked."
        lead="Including the ones with answers people would rather we dressed up. If something you need is not covered here, ask us directly — we would rather answer than have you guess."
        trail={[{ label: 'FAQ', href: '/faq' }]}
      />

      <Section labelledBy="faq-heading">
        <h2 id="faq-heading" className="sr-only">
          Frequently asked questions
        </h2>

        {groups.length > 0 ? (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.3fr)_minmax(0,0.7fr)] lg:gap-16">
            {/* An in-page index. Useful on a long FAQ, and it gives keyboard
                users a way past the accordion without tabbing through it. */}
            <nav aria-label="Jump to a section" className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-meta text-content-muted font-semibold tracking-[0.1em] uppercase">
                On this page
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {groups.map((group) => (
                  <li key={group.id}>
                    <a
                      href={`#${slugify(group.title)}`}
                      className="text-content-secondary decoration-border-strong hover:text-brand text-sm underline underline-offset-4"
                    >
                      {group.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-col gap-14">
              {groups.map((group) => (
                <section
                  key={group.id}
                  id={slugify(group.title)}
                  aria-labelledby={`${slugify(group.title)}-heading`}
                >
                  <Heading level={2} id={`${slugify(group.title)}-heading`}>
                    {group.title}
                  </Heading>
                  <FaqAccordion items={group.items} className="mt-6" />
                </section>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="Our FAQ is being updated"
            description="It will be back shortly. In the meantime, ask us anything directly."
            action={
              <Button asChild>
                <Link href="/contact">Ask a question</Link>
              </Button>
            }
          />
        )}
      </Section>

      {allItems.length > 0 ? (
        <JsonLd
          data={faqJsonLd(
            allItems.map((item) => ({ question: item.question, answer: item.answer })),
          )}
        />
      ) : null}

      <ClosingCta
        headline="Still have a question?"
        body="Ask it directly. We answer enquiries ourselves, and a straight question usually gets a straighter answer than a page like this can give."
        actionLabel="Ask us"
      />
    </>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
