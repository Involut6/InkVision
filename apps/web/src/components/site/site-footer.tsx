import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';

import { Eyebrow, Meta } from '@/components/ui/typography';
import { FOOTER_NAV } from '@/lib/navigation';
import type { PublicSiteSettingsDto } from '@inkvision/shared-types';

import { Logo } from './logo';
import { NewsletterForm } from './newsletter-form';

/**
 * The site footer.
 *
 * A server component: everything here comes from site settings, so there is no
 * reason to ship it to the browser. The newsletter form inside it is the only
 * interactive part and is a client component of its own.
 */
export function SiteFooter({ settings }: { settings: PublicSiteSettingsDto }) {
  const year = new Date().getFullYear();

  return (
    // No top margin: the closing call to action directly above sits on the
    // same inverse surface, and a band of light between two dark regions reads
    // as a gap rather than a separation. A hairline keeps them distinct.
    <footer className="bg-surface-inverse border-t border-white/12 text-white">
      <div className="page-shell py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-6">
            <Logo tone="inverse" />

            <p className="max-w-[32rem] text-sm leading-relaxed text-white/75">
              {settings.supportingStatement}
            </p>

            {settings.contactEmail || settings.contactPhone ? (
              <ul className="flex flex-col gap-2 text-sm">
                {settings.contactEmail ? (
                  <li>
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="hover:text-gold-300 hover:decoration-gold-300 inline-flex items-center gap-2 text-white/80 underline decoration-white/25 underline-offset-4"
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
                      className="hover:text-gold-300 hover:decoration-gold-300 inline-flex items-center gap-2 text-white/80 underline decoration-white/25 underline-offset-4"
                    >
                      <Phone aria-hidden="true" className="size-4" />
                      {settings.contactPhone}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : (
              // Rendered rather than hidden: the business has not supplied
              // contact details, and the enquiry form is the working route.
              <p className="text-meta text-white/60">
                <Link href="/contact" className="hover:text-gold-300 underline underline-offset-4">
                  Send an enquiry
                </Link>{' '}
                — we respond using the details you provide.
              </p>
            )}

            {settings.socialProfiles.length > 0 ? (
              <ul className="flex flex-wrap gap-4">
                {settings.socialProfiles.map((profile) => (
                  <li key={profile.url}>
                    <a
                      href={profile.url}
                      target="_blank"
                      rel="noopener noreferrer me"
                      className="text-meta hover:text-gold-300 tracking-[0.1em] text-white/60 uppercase underline-offset-4 hover:underline"
                    >
                      {profile.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-2">
            {settings.newsletterEnabled ? (
              <div className="sm:col-span-2">
                <Eyebrow className="text-white/70">{settings.newsletterHeadline}</Eyebrow>
                {settings.newsletterBody ? (
                  <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-white/75">
                    {settings.newsletterBody}
                  </p>
                ) : null}
                <NewsletterForm tone="inverse" source="footer" className="mt-5 max-w-[34rem]" />
              </div>
            ) : null}

            {FOOTER_NAV.map((group) => (
              <nav key={group.title} aria-labelledby={`footer-${group.title.toLowerCase()}`}>
                <Eyebrow
                  as="h2"
                  id={`footer-${group.title.toLowerCase()}`}
                  className="text-white/50"
                >
                  {group.title}
                </Eyebrow>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="hover:text-gold-300 text-sm text-white/70 underline-offset-4 transition-colors hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/12 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <Meta className="text-white/60">
            © {year} {settings.legalEntityName ?? settings.siteName}. All rights reserved.
          </Meta>

          {settings.legalPagesAwaitingReview ? (
            // Surfaced deliberately: the legal pages are unreviewed templates
            // and the site says so rather than implying they are final.
            <Meta className="text-white/60">
              Legal pages are templates awaiting professional review.
            </Meta>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
