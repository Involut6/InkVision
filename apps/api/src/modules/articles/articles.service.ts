import { Injectable } from '@nestjs/common';

import type {
  ArticleCategoryDto,
  ArticleDto,
  ArticleSummaryDto,
  Paginated,
  TagDto,
} from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  ResourceConflictException,
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { paginate, resolvePagination } from '../../common/dto/pagination.dto.js';
import { estimateReadingTimeMinutes, prepareRichText } from '../../common/utils/rich-text.js';
import { slugify, uniqueSlug } from '../../common/utils/slug.js';
import { AuditService } from '../audit/audit.service.js';
import { publishedContentWhere } from '../content/mappers/publication.js';

import { toArticleDetail, toArticleSummary } from './article.mapper.js';
import type { AdminArticleListQueryDto, ArticleListQueryDto } from './dto/article-query.dto.js';
import type { CreateArticleDto, UpdateArticleDto } from './dto/article-write.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/** Relations loaded for list rows. Narrow on purpose: no body, no N+1. */
const LIST_INCLUDE = {
  category: true,
  author: { include: { avatar: true } },
  featuredImage: true,
  tags: { include: { tag: true } },
} satisfies Prisma.ArticleInclude;

const DETAIL_INCLUDE = { ...LIST_INCLUDE, ogImage: true } satisfies Prisma.ArticleInclude;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public reads
  // ---------------------------------------------------------------------------

  async listPublic(query: ArticleListQueryDto): Promise<Paginated<ArticleSummaryDto>> {
    const pagination = resolvePagination(query);
    const where = this.buildPublicWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy:
          query.sort === 'title'
            ? { title: query.direction ?? 'asc' }
            : [{ publishedAt: query.direction ?? 'desc' }, { createdAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.article.count({ where }),
    ]);

    return paginate(
      rows.map((row) => toArticleSummary(row, this.config)),
      total,
      pagination,
    );
  }

  async findPublicBySlug(slug: string): Promise<ArticleDto> {
    const row = await this.prisma.article.findFirst({
      where: { slug, ...publishedContentWhere() },
      include: DETAIL_INCLUDE,
    });

    if (!row) throw new ResourceNotFoundException('Article', slug);

    const related = await this.findRelated(row.id, row.categoryId);
    return toArticleDetail(row, related, this.config);
  }

  /**
   * Related reading: same category first, then recent articles to fill the row.
   * Two bounded queries rather than a correlated subquery per article.
   */
  private async findRelated(
    excludeId: string,
    categoryId: string | null,
    limit = 3,
  ): Promise<ArticleSummaryDto[]> {
    const base = { ...publishedContentWhere(), id: { not: excludeId } };

    const sameCategory = categoryId
      ? await this.prisma.article.findMany({
          where: { ...base, categoryId },
          include: LIST_INCLUDE,
          orderBy: { publishedAt: 'desc' },
          take: limit,
        })
      : [];

    if (sameCategory.length >= limit) {
      return sameCategory.map((row) => toArticleSummary(row, this.config));
    }

    const filler = await this.prisma.article.findMany({
      where: { ...base, id: { notIn: [excludeId, ...sameCategory.map((row) => row.id)] } },
      include: LIST_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: limit - sameCategory.length,
    });

    return [...sameCategory, ...filler].map((row) => toArticleSummary(row, this.config));
  }

  async listCategories(): Promise<ArticleCategoryDto[]> {
    const rows = await this.prisma.articleCategory.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { articles: { where: publishedContentWhere() } } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      articleCount: row._count.articles,
    }));
  }

  async listTags(): Promise<TagDto[]> {
    const rows = await this.prisma.tag.findMany({
      where: { articles: { some: { article: publishedContentWhere() } } },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true },
    });
    return rows;
  }

  // ---------------------------------------------------------------------------
  // Admin reads
  // ---------------------------------------------------------------------------

  async listForAdmin(
    query: AdminArticleListQueryDto,
  ): Promise<Paginated<ArticleSummaryDto & { status: string }>> {
    const pagination = resolvePagination(query);

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.search ? this.searchWhere(query.search) : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.article.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({ ...toArticleSummary(row, this.config), status: row.status })),
      total,
      pagination,
    );
  }

  /** Admin detail, including drafts — this is the preview source. */
  async findForAdmin(id: string) {
    const row = await this.prisma.article.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) throw new ResourceNotFoundException('Article', id);
    return { ...row, bodyHtml: row.bodyHtml, bodyText: row.bodyText };
  }

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  async create(dto: CreateArticleDto, actor: AuthenticatedUser) {
    const body = prepareRichText(dto.bodyHtml);
    const slug = await this.resolveSlug(dto.slug ?? dto.title);

    const article = await this.prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          slug,
          title: dto.title,
          summary: dto.summary,
          bodyHtml: body.html,
          bodyText: body.text,
          readingTimeMinutes: estimateReadingTimeMinutes(body.text),
          categoryId: dto.categoryId ?? null,
          authorId: dto.authorId ?? null,
          featuredImageId: dto.featuredImageId ?? null,
          ogImageId: dto.ogImageId ?? null,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          noIndex: dto.noIndex ?? false,
          featured: dto.featured ?? false,
          status: 'DRAFT',
          createdById: actor.id,
        },
      });

      if (dto.tagNames?.length) {
        await this.syncTags(tx, created.id, dto.tagNames);
      }
      if (dto.serviceIds?.length) {
        await tx.articleService.createMany({
          data: dto.serviceIds.map((serviceId) => ({ articleId: created.id, serviceId })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'article.created',
      entityType: 'Article',
      entityId: article.id,
      summary: `Created article "${article.title}" as a draft`,
    });

    return this.findForAdmin(article.id);
  }

  async update(id: string, dto: UpdateArticleDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Article', id);

    const body = dto.bodyHtml ? prepareRichText(dto.bodyHtml) : null;
    const slug =
      dto.slug && dto.slug !== existing.slug ? await this.resolveSlug(dto.slug, id) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: {
          ...(slug ? { slug } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(body
            ? {
                bodyHtml: body.html,
                bodyText: body.text,
                readingTimeMinutes: estimateReadingTimeMinutes(body.text),
              }
            : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.authorId !== undefined ? { authorId: dto.authorId } : {}),
          ...(dto.featuredImageId !== undefined ? { featuredImageId: dto.featuredImageId } : {}),
          ...(dto.ogImageId !== undefined ? { ogImageId: dto.ogImageId } : {}),
          ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
          ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
          ...(dto.noIndex !== undefined ? { noIndex: dto.noIndex } : {}),
          ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
        },
      });

      if (dto.tagNames) {
        await tx.articleTag.deleteMany({ where: { articleId: id } });
        await this.syncTags(tx, id, dto.tagNames);
      }

      if (dto.serviceIds) {
        await tx.articleService.deleteMany({ where: { articleId: id } });
        if (dto.serviceIds.length) {
          await tx.articleService.createMany({
            data: dto.serviceIds.map((serviceId) => ({ articleId: id, serviceId })),
            skipDuplicates: true,
          });
        }
      }
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'article.updated',
      entityType: 'Article',
      entityId: id,
      summary: `Updated article "${dto.title ?? existing.title}"`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.findForAdmin(id);
  }

  /**
   * Publishes an article, optionally at a future moment.
   *
   * A future date stores SCHEDULED; the public read path treats a SCHEDULED row
   * as visible only once its timestamp has passed, so scheduling is correct
   * without a cron job.
   */
  async publish(id: string, publishAt: string | undefined, actor: AuthenticatedUser) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Article', id);

    if (!existing.summary.trim()) {
      throw new ValidationFailedException({
        summary: ['Add a summary before publishing: it is used in listings and search results.'],
      });
    }
    if (!existing.bodyText.trim()) {
      throw new ValidationFailedException({ bodyHtml: ['An article cannot be published empty.'] });
    }

    const when = publishAt ? new Date(publishAt) : new Date();
    const isFuture = when.getTime() > Date.now();

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        status: isFuture ? 'SCHEDULED' : 'PUBLISHED',
        publishedAt: when,
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: isFuture ? 'article.scheduled' : 'article.published',
      entityType: 'Article',
      entityId: id,
      summary: isFuture
        ? `Scheduled "${updated.title}" for ${when.toISOString()}`
        : `Published "${updated.title}"`,
    });

    return this.findForAdmin(id);
  }

  async unpublish(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Article', id);

    const updated = await this.prisma.article.update({
      where: { id },
      // publishedAt is kept: it is the original publication date, which matters
      // editorially if the piece is published again.
      data: { status: 'DRAFT' },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'article.unpublished',
      entityType: 'Article',
      entityId: id,
      summary: `Unpublished "${updated.title}"`,
    });

    return this.findForAdmin(id);
  }

  async archive(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Article', id);

    await this.prisma.article.update({ where: { id }, data: { status: 'ARCHIVED' } });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'article.archived',
      entityType: 'Article',
      entityId: id,
      summary: `Archived "${existing.title}"`,
    });

    return this.findForAdmin(id);
  }

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async createCategory(name: string, description: string | undefined, actor: AuthenticatedUser) {
    const slug = slugify(name);
    const existing = await this.prisma.articleCategory.findUnique({ where: { slug } });
    if (existing) throw new ResourceConflictException(`A category named "${name}" already exists.`);

    const created = await this.prisma.articleCategory.create({
      data: { slug, name, description: description ?? null },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'article_category.created',
      entityType: 'ArticleCategory',
      entityId: created.id,
      summary: `Created category "${name}"`,
    });

    return created;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private buildPublicWhere(query: ArticleListQueryDto) {
    return {
      ...publishedContentWhere(),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag } } } } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(query.search ? this.searchWhere(query.search) : {}),
    };
  }

  /**
   * Case-insensitive search over the editorial fields. `bodyText` (not
   * `bodyHtml`) is searched so markup never produces a false match.
   */
  private searchWhere(search: string) {
    const term = search.trim().slice(0, 120);
    return {
      OR: [
        { title: { contains: term, mode: 'insensitive' as const } },
        { summary: { contains: term, mode: 'insensitive' as const } },
        { bodyText: { contains: term, mode: 'insensitive' as const } },
      ],
    };
  }

  private async resolveSlug(source: string, excludeId?: string): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new ValidationFailedException({ slug: ['Could not derive a slug from the title.'] });

    const conflicts = await this.prisma.article.findMany({
      where: {
        slug: { startsWith: base },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { slug: true },
    });

    return uniqueSlug(base, new Set(conflicts.map((row) => row.slug)));
  }

  /** Creates missing tags and links them, in one round trip per step. */
  private async syncTags(
    tx: Pick<PrismaService, 'tag' | 'articleTag'>,
    articleId: string,
    tagNames: readonly string[],
  ): Promise<void> {
    const normalised = [
      ...new Map(
        tagNames
          .map((name) => name.trim())
          .filter((name) => name.length > 0)
          .map((name) => [slugify(name), name] as const),
      ),
    ].filter(([slug]) => slug.length > 0);

    if (normalised.length === 0) return;

    await tx.tag.createMany({
      data: normalised.map(([slug, name]) => ({ slug, name })),
      skipDuplicates: true,
    });

    const tags = await tx.tag.findMany({
      where: { slug: { in: normalised.map(([slug]) => slug) } },
      select: { id: true },
    });

    await tx.articleTag.createMany({
      data: tags.map((tag) => ({ articleId, tagId: tag.id })),
      skipDuplicates: true,
    });
  }
}
