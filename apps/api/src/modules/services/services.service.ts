import { Injectable } from '@nestjs/common';

import type { ServiceDto, ServiceSummaryDto } from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ResourceNotFoundException } from '../../common/errors/app.errors.js';
import { prepareRichText } from '../../common/utils/rich-text.js';
import { toImageRef } from '../content/mappers/media.mapper.js';
import { publishedWhere } from '../content/mappers/publication.js';
import { AuditService } from '../audit/audit.service.js';

import type { UpdateServiceDto } from './dto/update-service.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

/** Relations needed to render a service detail page in one query. */
const DETAIL_INCLUDE = {
  components: { orderBy: { position: 'asc' } },
  processStages: { orderBy: { position: 'asc' } },
  faqs: { where: { isPublished: true }, orderBy: { position: 'asc' } },
  ogImage: true,
  caseStudies: {
    include: { caseStudy: { include: { category: true, coverImage: true } } },
  },
  articles: {
    include: {
      article: {
        include: { category: true, author: { include: { avatar: true } }, featuredImage: true },
      },
    },
  },
} satisfies Prisma.ServiceInclude;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Public: the four principal service categories, in editorial order. */
  async listPublic(): Promise<ServiceSummaryDto[]> {
    const rows = await this.prisma.service.findMany({
      where: publishedWhere(),
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        tagline: true,
        businessNeed: true,
        position: true,
        icon: true,
      },
    });

    return rows;
  }

  async findPublicBySlug(slug: string): Promise<ServiceDto> {
    const row = await this.prisma.service.findFirst({
      where: { slug, ...publishedWhere() },
      include: DETAIL_INCLUDE,
    });

    if (!row) throw new ResourceNotFoundException('Service', slug);

    const now = new Date();

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      tagline: row.tagline,
      businessNeed: row.businessNeed,
      position: row.position,
      icon: row.icon,
      audience: row.audience,
      problem: { html: row.problemHtml, text: row.problemText },
      approach: { html: row.approachHtml, text: row.approachText },
      components: row.components.map((component) => ({
        id: component.id,
        title: component.title,
        description: component.description,
        position: component.position,
      })),
      deliverables: row.deliverables,
      engagementProcess: row.processStages.map((stage) => ({
        id: stage.id,
        position: stage.position,
        title: stage.title,
        summary: stage.summary,
        detail: stage.detail,
      })),
      faqs: row.faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        position: faq.position,
      })),
      ctaHeadline: row.ctaHeadline,
      ctaBody: row.ctaBody,
      // Only published, non-future work and articles are surfaced here.
      relatedCaseStudies: row.caseStudies
        .map((link) => link.caseStudy)
        .filter((study) => study.status === 'PUBLISHED' && (study.publishedAt ?? now) <= now)
        .map((study) => ({
          id: study.id,
          slug: study.slug,
          title: study.title,
          summary: study.summary,
          kind: study.kind,
          category: study.category
            ? {
                id: study.category.id,
                slug: study.category.slug,
                name: study.category.name,
                description: study.category.description,
              }
            : null,
          clientName: study.clientApproved ? study.clientName : null,
          industry: study.industry,
          coverImage: toImageRef(study.coverImage, this.config),
          publishedAt: study.publishedAt?.toISOString() ?? null,
          featured: study.featured,
        })),
      relatedArticles: row.articles
        .map((link) => link.article)
        .filter((article) => article.status === 'PUBLISHED' && (article.publishedAt ?? now) <= now)
        .map((article) => ({
          id: article.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          category: article.category
            ? {
                id: article.category.id,
                slug: article.category.slug,
                name: article.category.name,
                description: article.category.description,
              }
            : null,
          tags: [],
          author: article.author
            ? {
                id: article.author.id,
                slug: article.author.slug,
                name: article.author.name,
                role: article.author.role,
                bio: article.author.bio,
                avatar: toImageRef(article.author.avatar, this.config),
              }
            : null,
          featuredImage: toImageRef(article.featuredImage, this.config),
          readingTimeMinutes: article.readingTimeMinutes,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          updatedAt: article.updatedAt.toISOString(),
          featured: article.featured,
        })),
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
      ...(toImageRef(row.ogImage, this.config)
        ? { ogImage: toImageRef(row.ogImage, this.config)! }
        : {}),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Admin: every service regardless of status. */
  async listForAdmin() {
    return this.prisma.service.findMany({
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      include: {
        components: { orderBy: { position: 'asc' } },
        faqs: { orderBy: { position: 'asc' } },
      },
    });
  }

  async findForAdmin(id: string) {
    const row = await this.prisma.service.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) throw new ResourceNotFoundException('Service', id);
    return row;
  }

  /**
   * Updates editable service copy.
   *
   * Components, process stages and FAQs are replaced wholesale inside a
   * transaction: partial updates of ordered child collections produce confusing
   * half-states when a request fails midway.
   */
  async update(id: string, dto: UpdateServiceDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Service', id);

    const problem = dto.problemHtml ? prepareRichText(dto.problemHtml) : null;
    const approach = dto.approachHtml ? prepareRichText(dto.approachHtml) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.components) {
        await tx.serviceComponent.deleteMany({ where: { serviceId: id } });
        await tx.serviceComponent.createMany({
          data: dto.components.map((component, index) => ({
            serviceId: id,
            title: component.title,
            description: component.description,
            position: component.position ?? index,
          })),
        });
      }

      if (dto.processStages) {
        await tx.serviceProcessStage.deleteMany({ where: { serviceId: id } });
        await tx.serviceProcessStage.createMany({
          data: dto.processStages.map((stage, index) => ({
            serviceId: id,
            title: stage.title,
            summary: stage.summary,
            detail: stage.detail,
            position: stage.position ?? index,
          })),
        });
      }

      if (dto.faqs) {
        await tx.faqItem.deleteMany({ where: { serviceId: id } });
        await tx.faqItem.createMany({
          data: dto.faqs.map((faq, index) => ({
            serviceId: id,
            question: faq.question,
            answer: faq.answer,
            position: faq.position ?? index,
          })),
        });
      }

      return tx.service.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.tagline !== undefined ? { tagline: dto.tagline } : {}),
          ...(dto.businessNeed !== undefined ? { businessNeed: dto.businessNeed } : {}),
          ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
          ...(problem ? { problemHtml: problem.html, problemText: problem.text } : {}),
          ...(approach ? { approachHtml: approach.html, approachText: approach.text } : {}),
          ...(dto.deliverables !== undefined ? { deliverables: dto.deliverables } : {}),
          ...(dto.ctaHeadline !== undefined ? { ctaHeadline: dto.ctaHeadline } : {}),
          ...(dto.ctaBody !== undefined ? { ctaBody: dto.ctaBody } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
          ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
          ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
        },
        include: DETAIL_INCLUDE,
      });
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'service.updated',
      entityType: 'Service',
      entityId: id,
      summary: `Updated service "${updated.title}"`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return updated;
  }
}
