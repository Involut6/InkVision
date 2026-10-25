import { Injectable } from '@nestjs/common';

import type {
  CaseStudyDto,
  CaseStudySummaryDto,
  Paginated,
  PortfolioCategoryDto,
} from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { paginate, resolvePagination } from '../../common/dto/pagination.dto.js';
import { prepareRichText } from '../../common/utils/rich-text.js';
import { slugify, uniqueSlug } from '../../common/utils/slug.js';
import { AuditService } from '../audit/audit.service.js';
import { toImageRef } from '../content/mappers/media.mapper.js';
import { publishedContentWhere } from '../content/mappers/publication.js';

import type { CaseStudyListQueryDto } from './dto/case-study-query.dto.js';
import type { CreateCaseStudyDto, UpdateCaseStudyDto } from './dto/case-study-write.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

const LIST_INCLUDE = { category: true, coverImage: true } satisfies Prisma.CaseStudyInclude;
const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  excerpts: { orderBy: { position: 'asc' } },
  services: { include: { service: true } },
} satisfies Prisma.CaseStudyInclude;

@Injectable()
export class CaseStudiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly audit: AuditService,
  ) {}

  async listPublic(query: CaseStudyListQueryDto): Promise<Paginated<CaseStudySummaryDto>> {
    const pagination = resolvePagination(query);

    const where = {
      ...publishedContentWhere(),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.caseStudy.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: [{ featured: 'desc' }, { position: 'asc' }, { publishedAt: 'desc' }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.caseStudy.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.toSummary(row)),
      total,
      pagination,
    );
  }

  async findPublicBySlug(slug: string): Promise<CaseStudyDto> {
    const row = await this.prisma.caseStudy.findFirst({
      where: { slug, ...publishedContentWhere() },
      include: DETAIL_INCLUDE,
    });

    if (!row) throw new ResourceNotFoundException('Case study', slug);

    return {
      ...this.toSummary(row),
      challenge: { html: row.challengeHtml, text: row.challengeText },
      objective: { html: row.objectiveHtml, text: row.objectiveText },
      strategicQuestion: row.strategicQuestion,
      researchApproach: { html: row.researchApproachHtml, text: row.researchApproachText },
      editorialApproach: { html: row.editorialApproachHtml, text: row.editorialApproachText },
      deliverables: row.deliverables,
      excerpts: row.excerpts.map((item) => ({
        id: item.id,
        label: item.label,
        body: item.body,
        position: item.position,
      })),
      // Outcomes are withheld unless they have been verified AND, for client
      // work, approved for publication. This is a content-integrity rule, not a
      // presentation preference, so it lives on the read path.
      outcomes: this.visibleOutcomes(row),
      outcomesVerified: row.outcomesVerified,
      updatedAt: row.updatedAt.toISOString(),
      relatedServices: row.services.map((link) => ({
        id: link.service.id,
        slug: link.service.slug,
        title: link.service.title,
        tagline: link.service.tagline,
        businessNeed: link.service.businessNeed,
        position: link.service.position,
        icon: link.service.icon,
      })),
      ...(row.seoTitle ? { seoTitle: row.seoTitle } : {}),
      ...(row.seoDescription ? { seoDescription: row.seoDescription } : {}),
      ...(row.noIndex ? { noIndex: true } : {}),
    };
  }

  async listCategories(): Promise<PortfolioCategoryDto[]> {
    const rows = await this.prisma.portfolioCategory.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { caseStudies: { where: publishedContentWhere() } } } },
    });

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      caseStudyCount: row._count.caseStudies,
    }));
  }

  // ---------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------

  async listForAdmin(query: CaseStudyListQueryDto & { status?: string }) {
    const pagination = resolvePagination(query);

    const where = {
      ...(query.status ? { status: query.status as 'DRAFT' } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.caseStudy.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.caseStudy.count({ where }),
    ]);

    return paginate(
      rows.map((row) => ({
        ...this.toSummary(row, { revealClient: true }),
        status: row.status,
        clientApproved: row.clientApproved,
        outcomesVerified: row.outcomesVerified,
      })),
      total,
      pagination,
    );
  }

  async findForAdmin(id: string) {
    const row = await this.prisma.caseStudy.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!row) throw new ResourceNotFoundException('Case study', id);
    return row;
  }

  async create(dto: CreateCaseStudyDto, actor: AuthenticatedUser) {
    const slug = await this.resolveSlug(dto.slug ?? dto.title);

    const challenge = prepareRichText(dto.challengeHtml);
    const objective = prepareRichText(dto.objectiveHtml);
    const research = prepareRichText(dto.researchApproachHtml);
    const editorial = prepareRichText(dto.editorialApproachHtml);

    const created = await this.prisma.$transaction(async (tx) => {
      const study = await tx.caseStudy.create({
        data: {
          slug,
          title: dto.title,
          summary: dto.summary,
          kind: dto.kind,
          categoryId: dto.categoryId ?? null,
          clientName: dto.clientName ?? null,
          industry: dto.industry ?? null,
          strategicQuestion: dto.strategicQuestion ?? null,
          deliverables: dto.deliverables ?? [],
          outcomes: dto.outcomes ?? [],
          outcomesVerified: dto.outcomesVerified ?? false,
          clientApproved: dto.clientApproved ?? false,
          coverImageId: dto.coverImageId ?? null,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          status: 'DRAFT',
          challengeHtml: challenge.html,
          challengeText: challenge.text,
          objectiveHtml: objective.html,
          objectiveText: objective.text,
          researchApproachHtml: research.html,
          researchApproachText: research.text,
          editorialApproachHtml: editorial.html,
          editorialApproachText: editorial.text,
        },
      });

      if (dto.excerpts?.length) {
        await tx.caseStudyExcerpt.createMany({
          data: dto.excerpts.map((item, index) => ({
            caseStudyId: study.id,
            label: item.label,
            body: item.body,
            position: item.position ?? index,
          })),
        });
      }

      if (dto.serviceIds?.length) {
        await tx.caseStudyService.createMany({
          data: dto.serviceIds.map((serviceId) => ({ caseStudyId: study.id, serviceId })),
          skipDuplicates: true,
        });
      }

      return study;
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'case_study.created',
      entityType: 'CaseStudy',
      entityId: created.id,
      summary: `Created ${created.kind.toLowerCase()} case study "${created.title}" as a draft`,
    });

    return this.findForAdmin(created.id);
  }

  async update(id: string, dto: UpdateCaseStudyDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Case study', id);

    const prepared = this.prepareBodies(dto);
    const slug =
      dto.slug && dto.slug !== existing.slug ? await this.resolveSlug(dto.slug, id) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.caseStudy.update({
        where: { id },
        data: {
          ...(slug ? { slug } : {}),
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
          ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.clientName !== undefined ? { clientName: dto.clientName } : {}),
          ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
          ...(dto.strategicQuestion !== undefined
            ? { strategicQuestion: dto.strategicQuestion }
            : {}),
          ...(dto.deliverables !== undefined ? { deliverables: dto.deliverables } : {}),
          ...(dto.outcomes !== undefined ? { outcomes: dto.outcomes } : {}),
          ...(dto.outcomesVerified !== undefined ? { outcomesVerified: dto.outcomesVerified } : {}),
          ...(dto.clientApproved !== undefined ? { clientApproved: dto.clientApproved } : {}),
          ...(dto.coverImageId !== undefined ? { coverImageId: dto.coverImageId } : {}),
          ...(dto.seoTitle !== undefined ? { seoTitle: dto.seoTitle } : {}),
          ...(dto.seoDescription !== undefined ? { seoDescription: dto.seoDescription } : {}),
          ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
          ...(dto.position !== undefined ? { position: dto.position } : {}),
          ...prepared,
        },
      });

      if (dto.excerpts) {
        await tx.caseStudyExcerpt.deleteMany({ where: { caseStudyId: id } });
        if (dto.excerpts.length) {
          await tx.caseStudyExcerpt.createMany({
            data: dto.excerpts.map((item, index) => ({
              caseStudyId: id,
              label: item.label,
              body: item.body,
              position: item.position ?? index,
            })),
          });
        }
      }

      if (dto.serviceIds) {
        await tx.caseStudyService.deleteMany({ where: { caseStudyId: id } });
        if (dto.serviceIds.length) {
          await tx.caseStudyService.createMany({
            data: dto.serviceIds.map((serviceId) => ({ caseStudyId: id, serviceId })),
            skipDuplicates: true,
          });
        }
      }
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'case_study.updated',
      entityType: 'CaseStudy',
      entityId: id,
      summary: `Updated case study "${dto.title ?? existing.title}"`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.findForAdmin(id);
  }

  /**
   * Publishes a case study.
   *
   * Commissioned client work cannot be published without recorded client
   * approval: this is the guard that stops confidential material reaching the
   * public site through a careless click.
   */
  async publish(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Case study', id);

    if (existing.kind === 'COMMISSIONED' && !existing.clientApproved) {
      throw new ValidationFailedException({
        clientApproved: [
          'Commissioned client work needs recorded client approval before it can be published.',
        ],
      });
    }

    if (existing.outcomes.length > 0 && !existing.outcomesVerified) {
      throw new ValidationFailedException({
        outcomesVerified: [
          'Outcomes must be marked verified before publishing, or removed from the case study.',
        ],
      });
    }

    const updated = await this.prisma.caseStudy.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: existing.publishedAt ?? new Date() },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'case_study.published',
      entityType: 'CaseStudy',
      entityId: id,
      summary: `Published case study "${updated.title}" (${updated.kind})`,
    });

    return this.findForAdmin(id);
  }

  async unpublish(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.caseStudy.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Case study', id);

    await this.prisma.caseStudy.update({ where: { id }, data: { status: 'DRAFT' } });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'case_study.unpublished',
      entityType: 'CaseStudy',
      entityId: id,
      summary: `Unpublished case study "${existing.title}"`,
    });

    return this.findForAdmin(id);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private toSummary(
    row: {
      id: string;
      slug: string;
      title: string;
      summary: string;
      kind: CaseStudySummaryDto['kind'];
      clientName: string | null;
      clientApproved: boolean;
      industry: string | null;
      publishedAt: Date | null;
      featured: boolean;
      category: { id: string; slug: string; name: string; description: string | null } | null;
      coverImage: Parameters<typeof toImageRef>[0];
    },
    options: { revealClient?: boolean } = {},
  ): CaseStudySummaryDto {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      kind: row.kind,
      category: row.category
        ? {
            id: row.category.id,
            slug: row.category.slug,
            name: row.category.name,
            description: row.category.description,
          }
        : null,
      // The client's name is only ever exposed when they approved disclosure.
      clientName: options.revealClient || row.clientApproved ? row.clientName : null,
      industry: row.industry,
      coverImage: toImageRef(row.coverImage, this.config),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      featured: row.featured,
    };
  }

  private visibleOutcomes(row: {
    outcomes: string[];
    outcomesVerified: boolean;
    kind: string;
    clientApproved: boolean;
  }): string[] {
    if (!row.outcomesVerified) return [];
    if (row.kind === 'COMMISSIONED' && !row.clientApproved) return [];
    return row.outcomes;
  }

  /**
   * Sanitises whichever body fields were supplied. Returns only the keys that
   * were present, so a partial update leaves the others untouched.
   */
  private prepareBodies(dto: {
    challengeHtml?: string;
    objectiveHtml?: string;
    researchApproachHtml?: string;
    editorialApproachHtml?: string;
  }) {
    const challenge = dto.challengeHtml ? prepareRichText(dto.challengeHtml) : null;
    const objective = dto.objectiveHtml ? prepareRichText(dto.objectiveHtml) : null;
    const research = dto.researchApproachHtml ? prepareRichText(dto.researchApproachHtml) : null;
    const editorial = dto.editorialApproachHtml ? prepareRichText(dto.editorialApproachHtml) : null;

    return {
      ...(challenge ? { challengeHtml: challenge.html, challengeText: challenge.text } : {}),
      ...(objective ? { objectiveHtml: objective.html, objectiveText: objective.text } : {}),
      ...(research
        ? { researchApproachHtml: research.html, researchApproachText: research.text }
        : {}),
      ...(editorial
        ? { editorialApproachHtml: editorial.html, editorialApproachText: editorial.text }
        : {}),
    };
  }

  private async resolveSlug(source: string, excludeId?: string): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new ValidationFailedException({ slug: ['Could not derive a slug from the title.'] });

    const conflicts = await this.prisma.caseStudy.findMany({
      where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { slug: true },
    });

    return uniqueSlug(base, new Set(conflicts.map((row) => row.slug)));
  }
}
