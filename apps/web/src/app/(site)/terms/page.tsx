import type { Metadata } from 'next';

import { LegalPageView } from '@/components/site/legal-page';
import { getLegalPage, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getLegalPage('terms'), getSiteSettings()]);

  return buildMetadata({
    title: page?.seoTitle ?? 'Terms of Use',
    description:
      page?.seoDescription ?? 'The terms governing your use of the InkVision Creatives website.',
    path: '/terms',
    settings,
  });
}

export default async function LegalRoute() {
  const page = await getLegalPage('terms');
  return <LegalPageView page={page} trailLabel="Terms of Use" />;
}
