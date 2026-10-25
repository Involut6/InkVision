import { CalendarClock, Mail, MessageSquare, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Section } from '@/components/home/section';
import { EnquiryForm } from '@/components/site/enquiry-form';
import { PageHeader } from '@/components/site/page-header';
import { Heading, Meta } from '@/components/ui/typography';
import { getServices, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';
import { SERVICE_INTERESTS } from '@inkvision/shared-types';

interface PageProps {
  searchParams: Promise<{ service?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return buildMetadata({
    title: 'Contact',
    description:
      'Tell us what you are working towards. We will review the details and respond using the contact information you provide.',
    path: '/contact',
    settings,
  });
}

export default async function ContactPage({ searchParams }: PageProps) {
  const [params, settings, services] = await Promise.all([
    searchParams,
    getSiteSettings(),
    getServices(),
  ]);

  // Pre-selects the dropdown when arriving from a service page.
  const preselected = SERVICE_INTERESTS.find((value) => value === params.service);

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Tell us what you want to be known for."
        lead="The more context you can give, the more useful our reply will be. We read every enquiry ourselves, and we will tell you honestly if we think another approach would serve you better."
        trail={[{ label: 'Contact', href: '/contact' }]}
      />

      <Section labelledBy="enquiry-form-heading">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16">
          <div>
            <h2 id="enquiry-form-heading" className="sr-only">
              Enquiry form
            </h2>
            <EnquiryForm defaultServiceInterest={preselected} />
          </div>

          <aside className="flex flex-col gap-8 lg:pt-2">
            <div className="bg-surface-sunken ring-border-subtle p-7 ring-1">
              <Heading level={3} as="h2" className="text-[1.0625rem]">
                What happens next
              </Heading>
              <ol className="mt-5 flex flex-col gap-4">
                {[
                  'We read your enquiry and consider whether we are the right fit.',
                  'We reply using the contact details you provide, usually with a question or two.',
                  'If it looks like a fit, we arrange a conversation to understand the work properly.',
                  'You receive a written proposal setting out scope, timeline and fees before any commitment.',
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="tabular text-meta text-accent shrink-0 font-sans font-semibold"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-content-secondary text-sm leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Scheduling appears only when a provider AND its URL are both
                configured, so the site never shows a dead "book a call". */}
            {settings.schedulingUrl ? (
              <div className="border-border-accent border-l-2 pl-6">
                <Heading level={3} as="h2" className="text-[1.0625rem]">
                  Prefer to book a time?
                </Heading>
                <p className="text-content-secondary mt-2 text-sm leading-relaxed">
                  You can put a discovery call straight into the diary.
                </p>
                <a
                  href={settings.schedulingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
                >
                  <CalendarClock aria-hidden="true" className="size-4" />
                  Book a discovery call
                </a>
              </div>
            ) : null}

            {settings.contactEmail || settings.contactPhone ? (
              <div>
                <Heading level={3} as="h2" className="text-[1.0625rem]">
                  Other ways to reach us
                </Heading>
                <ul className="mt-4 flex flex-col gap-3">
                  {settings.contactEmail ? (
                    <li>
                      <a
                        href={`mailto:${settings.contactEmail}`}
                        className="text-content-secondary decoration-border-strong hover:text-brand inline-flex items-center gap-2 text-sm underline underline-offset-4"
                      >
                        <Mail aria-hidden="true" className="size-4" />
                        {settings.contactEmail}
                      </a>
                    </li>
                  ) : null}
                  {settings.contactPhone ? (
                    <li>
                      <a
                        href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}
                        className="text-content-secondary decoration-border-strong hover:text-brand inline-flex items-center gap-2 text-sm underline underline-offset-4"
                      >
                        <Phone aria-hidden="true" className="size-4" />
                        {settings.contactPhone}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {services.length > 0 ? (
              <div>
                <Heading level={3} as="h2" className="text-[1.0625rem]">
                  Still deciding?
                </Heading>
                <p className="text-content-secondary mt-2 text-sm leading-relaxed">
                  Choosing “Not sure yet” above is perfectly fine. If you would rather read first:
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {services.map((service) => (
                    <li key={service.id}>
                      <Link
                        href={`/services/${service.slug}`}
                        className="text-content-secondary decoration-border-strong hover:text-brand inline-flex items-center gap-2 text-sm underline underline-offset-4"
                      >
                        <MessageSquare aria-hidden="true" className="size-3.5 shrink-0" />
                        {service.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Meta>
              We use your details only to respond to this enquiry. See our{' '}
              <Link href="/privacy" className="text-brand underline underline-offset-4">
                privacy notice
              </Link>
              .
            </Meta>
          </aside>
        </div>
      </Section>
    </>
  );
}
