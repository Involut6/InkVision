import type { ArticleDto, ArticleSummaryDto } from '@inkvision/shared-types';

import { type AppConfigService } from '../../config/configuration.js';
import { toImageRef, type MediaAssetRow } from '../content/mappers/media.mapper.js';

export interface ArticleRowRelations {
  id: string;
  slug: string;
  title: string;
  summary: string;
  readingTimeMinutes: number;
  publishedAt: Date | null;
  updatedAt: Date;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  noIndex: boolean;
  bodyHtml?: string;
  bodyText?: string;
  category: { id: string; slug: string; name: string; description: string | null } | null;
  author: {
    id: string;
    slug: string;
    name: string;
    role: string | null;
    bio: string | null;
    avatar: MediaAssetRow | null;
  } | null;
  featuredImage: MediaAssetRow | null;
  ogImage?: MediaAssetRow | null;
  tags?: { tag: { id: string; slug: string; name: string } }[];
}

export function toArticleSummary(
  row: ArticleRowRelations,
  config: AppConfigService,
): ArticleSummaryDto {
  const ogImage = toImageRef(row.ogImage ?? null, config);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
          description: row.category.description,
        }
      : null,
    tags: (row.tags ?? []).map((link) => ({
      id: link.tag.id,
      slug: link.tag.slug,
      name: link.tag.name,
    })),
    author: row.author
      ? {
          id: row.author.id,
          slug: row.author.slug,
          name: row.author.name,
          role: row.author.role,
          bio: row.author.bio,
          avatar: toImageRef(row.author.avatar, config),
        }
      : null,
    featuredImage: toImageRef(row.featuredImage, config),
    readingTimeMinutes: row.readingTimeMinutes,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    featured: row.featured,
    ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
    ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
    ...(ogImage ? { ogImage } : {}),
    ...(row.noIndex ? { noIndex: true } : {}),
  };
}

export function toArticleDetail(
  row: ArticleRowRelations & { bodyHtml: string; bodyText: string },
  related: readonly ArticleSummaryDto[],
  config: AppConfigService,
): ArticleDto {
  return {
    ...toArticleSummary(row, config),
    body: { html: row.bodyHtml, text: row.bodyText },
    relatedArticles: related,
  };
}
