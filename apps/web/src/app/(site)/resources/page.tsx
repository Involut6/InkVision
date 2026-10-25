import type { Metadata } from 'next';
import Link from 'next/link';

import { ResourceCard } from '@/components/content/resource-card';
import { CardGrid, Section } from '@/components/home/section';
import { ClosingCta } from '@/components/site/closing-cta';
import { PageHeader } from '@/components/site/page-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Body, Heading, SectionHeader } from '@/components/ui/typography';
import { getCommerceStatus, getProducts, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'Resources',
    description:
      'Practical workbooks and guides from InkVision Creatives, taking the same approach we use in client engagements in a form you can work through yourself.',
    path: '/resources',
    settings,
  });
}

export default async function ResourcesPage() {
  const [products, commerce] = await Promise.all([getProducts(), getCommerceStatus()]);

  const purchasable = products.filter((product) => product.purchasable);
  const upcoming = products.filter((product) => !product.purchasable);

  return (
    <>
      <PageHeader
        eyebrow="Resources"
        title="Practical tools you can use on your own."
        lead="Structured workbooks that take the same approach we use in client engagements, in a form you can work through yourself. Fewer, better resources rather than a catalogue."
        trail={[{ label: 'Resources', href: '/resources' }]}
      />

      {/* Purchasing is reported exactly as the server sees it. Nothing on this
          page offers a transaction the API would refuse. */}
      {!commerce.enabled ? (
        <div className="border-border-subtle bg-accent-soft border-b">
          <div className="page-shell py-4">
            <p className="text-gold-700 text-sm">
              <strong className="font-semibold">Purchasing is not open yet.</strong> These resources
              are listed so you can see what is in preparation. Each becomes available once its
              pricing, payment and delivery have been set up and tested end to end.{' '}
              <Link href="/contact" className="underline underline-offset-4">
                Tell us if you would like to know when
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <Section labelledBy="resources-list-heading">
        <h2 id="resources-list-heading" className="sr-only">
          Available resources
        </h2>

        {products.length > 0 ? (
          <div className="flex flex-col gap-14">
            {purchasable.length > 0 ? (
              <div>
                <SectionHeader eyebrow="Available now" heading="Ready to download" />
                <CardGrid className="mt-10">
                  {purchasable.map((product) => (
                    <ResourceCard key={product.id} product={product} />
                  ))}
                </CardGrid>
              </div>
            ) : null}

            {upcoming.length > 0 ? (
              <div>
                <SectionHeader
                  eyebrow="In preparation"
                  heading="Coming soon"
                  lead="Listed here so you can see what is on the way. Nothing is offered for sale until it can actually be delivered."
                />
                <CardGrid className="mt-10">
                  {upcoming.map((product) => (
                    <ResourceCard key={product.id} product={product} />
                  ))}
                </CardGrid>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Our first resources are in preparation"
            description="We would rather publish one resource that is genuinely useful than a catalogue of filler. Get in touch if there is something specific you would find valuable."
            action={
              <Button asChild>
                <Link href="/contact">Suggest a resource</Link>
              </Button>
            }
          />
        )}
      </Section>

      <Section tone="sunken" labelledBy="how-it-works-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <SectionHeader
            eyebrow="How purchasing works"
            heading={<span id="how-it-works-heading">What to expect</span>}
          />

          <div className="flex flex-col gap-6">
            <Body className="max-w-none">
              When a resource becomes available, buying it is straightforward: you pay through a
              secure payment provider, and your download link is issued once the payment has been
              confirmed with that provider — not before.
            </Body>

            <div className="[&>*]:ring-border-subtle grid gap-px sm:grid-cols-2 [&>*]:ring-1">
              {[
                {
                  title: 'Secure, time-limited links',
                  body: 'Download links expire and have a limited number of uses. If one lapses, you can generate a fresh one from your order page.',
                },
                {
                  title: 'Terms published first',
                  body: 'Price, format, contents and refund terms appear on the product page before purchase. No resource is sold without them.',
                },
                {
                  title: 'Immediate delivery',
                  body: 'Your link arrives by email as soon as payment is verified, along with your order reference.',
                },
                {
                  title: 'Support if anything fails',
                  body: 'A technical failure on our side is ours to fix, whatever the refund position. Contact us with your order reference.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-surface-raised p-6">
                  <Heading level={3} as="h3" className="text-base">
                    {item.title}
                  </Heading>
                  <p className="text-content-secondary mt-2 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            <p className="text-meta text-content-muted">
              See our{' '}
              <Link href="/refund-policy" className="text-brand underline underline-offset-4">
                refund policy
              </Link>{' '}
              for the full terms.
            </p>
          </div>
        </div>
      </Section>

      <ClosingCta
        headline="Need something more tailored?"
        body="Workbooks go only so far. If your situation needs judgement rather than a framework, that is what an engagement is for."
        actionLabel="Discuss your goals"
      />
    </>
  );
}
