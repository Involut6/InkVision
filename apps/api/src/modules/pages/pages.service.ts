import { Injectable } from '@nestjs/common';

import type {
  FaqGroupDto,
  LegalPageDto,
  ProcessStageDto,
  TestimonialDto,
} from '@inkvision/shared-types';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ResourceNotFoundException } from '../../common/errors/app.errors.js';
import { prepareRichText } from '../../common/utils/rich-text.js';
import { AuditService } from '../audit/audit.service.js';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UpdateLegalPageDto } from './dto/legal-page.dto.js';

type LegalSlug = LegalPageDto['slug'];

/** Public slug ↔ database enum. The enum cannot hold a hyphen. */
const SLUG_TO_ENUM = {
  privacy: 'privacy',
  terms: 'terms',
  'refund-policy': 'refund_policy',
} as const;

const ENUM_TO_SLUG = {
  privacy: 'privacy',
  terms: 'terms',
  refund_policy: 'refund-policy',
} as const;

/**
 * Content that belongs to a page rather than to a collection: the studio-wide
 * approach, FAQs, testimonials and the legal templates.
 */
@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The five-stage approach, rendered on `/approach` and the homepage. */
  async getApproachStages(): Promise<(ProcessStageDto & { clientRole: string; slug: string })[]> {
    const rows = await this.prisma.approachStage.findMany({ orderBy: { position: 'asc' } });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      position: row.position,
      title: row.title,
      summary: row.summary,
      detail: row.detailHtml,
      clientRole: row.clientRole,
    }));
  }

  async getFaqGroups(): Promise<FaqGroupDto[]> {
    const rows = await this.prisma.faqGroup.findMany({
      orderBy: { position: 'asc' },
      include: {
        items: { where: { isPublished: true }, orderBy: { position: 'asc' } },
      },
    });

    return rows
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        id: group.id,
        title: group.title,
        position: group.position,
        items: group.items.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          position: item.position,
        })),
      }));
  }

  /**
   * Published testimonials.
   *
   * Both `isApproved` and a published status are required. Nothing reaches the
   * public site on the strength of a status change alone, because an
   * unauthorised quote is a reputational and legal problem, not a layout gap.
   */
  async getTestimonials(): Promise<TestimonialDto[]> {
    const rows = await this.prisma.testimonial.findMany({
      where: { isApproved: true, status: 'PUBLISHED' },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      quote: row.quote,
      attributionName: row.attributionName,
      attributionRole: row.attributionRole,
      attributionOrganisation: row.attributionOrganisation,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }

  async getLegalPage(slug: LegalSlug): Promise<LegalPageDto> {
    const row = await this.prisma.legalPage.findUnique({ where: { slug: SLUG_TO_ENUM[slug] } });
    if (!row) throw new ResourceNotFoundException('Legal page', slug);

    return {
      slug: ENUM_TO_SLUG[row.slug],
      title: row.title,
      body: { html: row.bodyHtml, text: row.bodyText },
      status: row.status,
      awaitingReview: row.awaitingReview,
      effectiveAt: row.effectiveAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
    };
  }

  async listLegalPages(): Promise<LegalPageDto[]> {
    const slugs: LegalSlug[] = ['privacy', 'terms', 'refund-policy'];
    return Promise.all(slugs.map((slug) => this.getLegalPage(slug)));
  }

  async updateLegalPage(
    slug: LegalSlug,
    dto: UpdateLegalPageDto,
    actor: AuthenticatedUser,
  ): Promise<LegalPageDto> {
    const body = dto.bodyHtml ? prepareRichText(dto.bodyHtml) : null;

    await this.prisma.legalPage.update({
      where: { slug: SLUG_TO_ENUM[slug] },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(body ? { bodyHtml: body.html, bodyText: body.text } : {}),
        ...(dto.awaitingReview !== undefined ? { awaitingReview: dto.awaitingReview } : {}),
        ...(dto.effectiveAt !== undefined
          ? { effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : null }
          : {}),
        ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
        ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
      },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'legal_page.updated',
      entityType: 'LegalPage',
      entityId: slug,
      summary: `${actor.email} updated the ${slug} page`,
      metadata: { changedFields: Object.keys(dto), awaitingReview: dto.awaitingReview },
    });

    return this.getLegalPage(slug);
  }
}
