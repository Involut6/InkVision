import type { Metadata } from 'next';

import { Section } from '@/components/home/section';
import { PageHeader } from '@/components/site/page-header';
import { UnsubscribeForm } from '@/components/site/unsubscribe-form';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  // Never indexed: it exists only to be reached from an email footer.
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Newsletter"
        title="Unsubscribe"
        lead="You can rejoin at any time, and nothing else about your relationship with us changes."
      />

      <Section>
        <UnsubscribeForm token={token} />
      </Section>
    </>
  );
}
