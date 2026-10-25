import type { Metadata } from 'next';

import type { ImageRef, PublicSiteSettingsDto } from '@inkvision/shared-types';

import { absoluteUrl, publicEnv, siteUrl } from './env';

/**
 * Metadata helpers.
 *
 * Every public page gets a unique title and description, a canonical URL and
 * OpenGraph tags from here, so SEO is a property of the layer rather than
 * something each page remembers to do.
 */

export interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  settings?: PublicSiteSettingsDto;
  image?: ImageRef | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
  /** Set for pages that must never be indexed. */
  noIndex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  settings,
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  authors,
  noIndex = false,
}: PageMetadataInput): Metadata {
  const siteName = settings?.siteName ?? publicEnv.siteName;
  const canonical = absoluteUrl(path);
  const ogImage = image ?? settings?.defaultOgImage ?? null;

  return {
    title,
    description,
    alternates: { canonical },
    ...(noIndex
      ? { robots: { index: false, follow: false, nocache: true } }
      : {
          robots: {
            index: true,
            follow: true,
            googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
          },
        }),
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName,
      locale: 'en_GB',
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage.url,
                alt: ogImage.alt,
                ...(ogImage.width ? { width: ogImage.width } : {}),
                ...(ogImage.height ? { height: ogImage.height } : {}),
              },
            ],
          }
        : {}),
      ...(type === 'article'
        ? {
            ...(publishedTime ? { publishedTime } : {}),
            ...(modifiedTime ? { modifiedTime } : {}),
            ...(authors ? { authors } : {}),
          }
        : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage.url] } : {}),
    },
  };
}

/**
 * Organisation structured data.
 *
 * Only verified facts are emitted. Contact details, social profiles and the
 * legal entity name are omitted entirely when the business has not supplied
 * them, rather than filled with plausible placeholders — structured data is
 * read by machines as a factual claim.
 */
export function organisationJsonLd(settings: PublicSiteSettingsDto): Record<string, unknown> {
  const sameAs = settings.socialProfiles.map((profile) => profile.url);

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: settings.siteName,
    ...(settings.legalEntityName ? { legalName: settings.legalEntityName } : {}),
    url: siteUrl(),
    slogan: settings.tagline,
    description: settings.supportingStatement,
    ...(settings.defaultOgImage ? { image: settings.defaultOgImage.url } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(settings.contactEmail || settings.contactPhone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Enquiries',
            ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
            ...(settings.contactPhone ? { telephone: settings.contactPhone } : {}),
            availableLanguage: ['en'],
          },
        }
      : {}),
    knowsAbout: [
      'Executive visibility',
      'Thought leadership',
      'Ghostwriting',
      'Strategic communications',
      'Content strategy',
      'Executive communications',
    ],
  };
}

export function breadcrumbJsonLd(
  trail: readonly { label: string; href: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.label,
      item: absoluteUrl(entry.href),
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string | null;
  updatedAt: string;
  authorName: string | null;
  image: ImageRef | null;
  siteName: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(input.path) },
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    dateModified: input.updatedAt,
    ...(input.authorName ? { author: { '@type': 'Organization', name: input.authorName } } : {}),
    publisher: { '@type': 'Organization', name: input.siteName, url: siteUrl() },
    ...(input.image ? { image: [input.image.url] } : {}),
  };
}

export function faqJsonLd(
  items: readonly { question: string; answer: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
