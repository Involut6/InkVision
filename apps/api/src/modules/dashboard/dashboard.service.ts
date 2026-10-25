import { Injectable } from '@nestjs/common';

import type { AdminDashboardDto } from '@inkvision/shared-types';

import { PrismaService } from '../../prisma/prisma.service.js';
import { resolveDateRange, type DateRangeQueryDto } from '../../common/dto/date-range.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { EnquiriesService } from '../enquiries/enquiries.service.js';
import { NewsletterService } from '../newsletter/newsletter.service.js';

/**
 * Dashboard aggregation.
 *
 * Every count is a database aggregate — no rows are loaded to be counted in
 * JavaScript — and all of them are issued in a single transaction so the figures
 * on screen are mutually consistent.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enquiries: EnquiriesService,
    private readonly newsletter: NewsletterService,
    private readonly audit: AuditService,
  ) {}

  async build(query: DateRangeQueryDto): Promise<AdminDashboardDto> {
    const range = resolveDateRange(query, 30);

    const [
      totalEnquiries,
      enquiriesInRange,
      publishedArticles,
      draftArticles,
      publishedCaseStudies,
      draftCaseStudies,
      activeProducts,
      totalProducts,
    ] = await this.prisma.$transaction([
      this.prisma.enquiry.count(),
      this.prisma.enquiry.count({ where: { createdAt: { gte: range.from, lte: range.to } } }),
      this.prisma.article.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.article.count({ where: { status: { in: ['DRAFT', 'SCHEDULED'] } } }),
      this.prisma.caseStudy.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.caseStudy.count({ where: { status: 'DRAFT' } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.product.count(),
    ]);

    const [byStatus, recentEnquiries, newsletterSubscribers, recentActivity] = await Promise.all([
      this.enquiries.countsByStatus(),
      this.enquiries.list({ perPage: 5, page: 1 }),
      this.newsletter.countSubscribed(),
      this.audit.recent(10),
    ]);

    return {
      enquiries: {
        total: totalEnquiries,
        inRange: enquiriesInRange,
        byStatus,
        recent: recentEnquiries.data,
      },
      content: {
        publishedArticles,
        draftArticles,
        publishedCaseStudies,
        draftCaseStudies,
        activeProducts,
        totalProducts,
        newsletterSubscribers,
      },
      recentActivity,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    };
  }
}
