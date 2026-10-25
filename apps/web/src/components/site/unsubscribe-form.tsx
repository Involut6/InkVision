'use client';

import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Body, Heading } from '@/components/ui/typography';
import { browserApi } from '@/lib/api.browser';

/**
 * One-click unsubscribe.
 *
 * The request runs on an explicit click rather than on page load: email
 * security scanners and link prefetchers follow URLs, and an unsubscribe that
 * fires on GET would remove people who never asked to leave.
 */
export function UnsubscribeForm({ token }: { token?: string }) {
  const mutation = useMutation({
    mutationFn: () =>
      browserApi.post<{ unsubscribed: boolean }>('/newsletter/unsubscribe', { token }),
  });

  if (!token) {
    return (
      <div className="max-w-measure">
        <Heading level={3} as="h2">
          This link is incomplete
        </Heading>
        <Body className="mt-3">
          Unsubscribe links come from the footer of any email we send. Please open the link from
          your email again, or reply to any of our emails and we will remove you by hand.
        </Body>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div role="status" aria-live="polite" className="max-w-measure flex flex-col gap-4">
        <Check aria-hidden="true" className="text-success size-6" />
        <Heading level={3} as="h2">
          You have been unsubscribed
        </Heading>
        <Body>
          You will not receive further newsletter emails from us. If you unsubscribed by mistake,
          you can subscribe again from any page on the site.
        </Body>
      </div>
    );
  }

  return (
    <div className="max-w-measure flex flex-col gap-5">
      <Body>
        Confirm below and we will remove your address from the newsletter list straight away.
      </Body>

      <div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? 'Unsubscribing…' : 'Confirm unsubscribe'}
        </Button>
      </div>

      {mutation.isError ? (
        <p role="alert" className="text-meta text-danger">
          We could not complete that just now. Please try again, or reply to any of our emails and
          we will remove you by hand.
        </p>
      ) : null}
    </div>
  );
}
