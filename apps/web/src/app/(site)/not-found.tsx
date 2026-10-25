import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Display, Eyebrow, GoldRule, Lead } from '@/components/ui/typography';

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col justify-center py-20">
      <div className="flex max-w-[40rem] flex-col gap-6">
        <GoldRule />
        <Eyebrow>404 — Page not found</Eyebrow>
        <Display as="h1">We could not find that page.</Display>
        <Lead>
          The link may be out of date, or the page may have moved. The sections below are a good
          place to pick up again.
        </Lead>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">Return to the homepage</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/services">Explore our services</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
