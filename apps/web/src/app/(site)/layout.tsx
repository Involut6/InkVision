import type { ReactNode } from 'react';

import { JsonLd } from '@/components/json-ld';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { getSiteSettings } from '@/lib/content';
import { organisationJsonLd } from '@/lib/metadata';

/**
 * The public website shell.
 *
 * The header, footer and organisation structured data live here rather than in
 * the root layout, so the administration portal does not inherit the marketing
 * chrome — an admin screen with a "Discuss your goals" call to action above it
 * is nobody's intention.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();

  return (
    <>
      {/* First focusable element on the page, so a keyboard user can jump past
          the navigation on every route. */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="flex min-h-dvh flex-col">
        <SiteHeader />

        <main id="main-content" className="flex-1">
          {children}
        </main>

        <SiteFooter settings={settings} />
      </div>

      <JsonLd data={organisationJsonLd(settings)} />
    </>
  );
}
