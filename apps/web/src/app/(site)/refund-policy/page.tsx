import type { Metadata } from 'next';

import { LegalPageView } from '@/components/site/legal-page';
import { getLegalPage, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getLegalPage('refund-policy'), getSiteSettings()]);

  return buildMetadata({
    title: page?.seoTitle ?? 'Refund Policy',
    description:
      page?.seoDescription ?? 'Refund terms for digital resources bought from InkVision Creatives.',
    path: '/refund-policy',
    settings,
  });
}

export default async function LegalRoute() {
  const page = await getLegalPage('refund-policy');
  return <LegalPageView page={page} trailLabel="Refund Policy" />;
}
