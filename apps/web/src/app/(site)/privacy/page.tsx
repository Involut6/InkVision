import type { Metadata } from 'next';

import { LegalPageView } from '@/components/site/legal-page';
import { getLegalPage, getSiteSettings } from '@/lib/content';
import { buildMetadata } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([getLegalPage('privacy'), getSiteSettings()]);

  return buildMetadata({
    title: page?.seoTitle ?? 'Privacy Notice',
    description:
      page?.seoDescription ??
      'How InkVision Creatives collects, uses and protects the personal data you provide.',
    path: '/privacy',
    settings,
  });
}

export default async function LegalRoute() {
  const page = await getLegalPage('privacy');
  return <LegalPageView page={page} trailLabel="Privacy Notice" />;
}
