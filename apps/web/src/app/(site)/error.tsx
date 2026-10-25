'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Display, Eyebrow, GoldRule, Lead } from '@/components/ui/typography';

/**
 * The route-level error boundary.
 *
 * The visitor is shown a plain apology and a way forward; the underlying digest
 * goes to the console for diagnosis. No stack trace or internal detail reaches
 * the page.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[60vh] flex-col justify-center py-20">
      <div className="flex max-w-[40rem] flex-col gap-6">
        <GoldRule />
        <Eyebrow>Something went wrong</Eyebrow>
        <Display as="h1">We could not load this page.</Display>
        <Lead>
          This is on our side rather than yours. Trying again often resolves it; if it persists, do
          get in touch and we will look into it.
        </Lead>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/contact">Contact us</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
