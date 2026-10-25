import { Injectable, Logger } from '@nestjs/common';

import type {
  CreateEnquiryResponse,
  EnquiryDto,
  EnquiryStatus,
  EnquirySummaryDto,
  Paginated,
} from '@inkvision/shared-types';

import { AppConfigService } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ResourceNotFoundException,
  ValidationFailedException,
} from '../../common/errors/app.errors.js';
import { paginate, resolvePagination } from '../../common/dto/pagination.dto.js';
import { generateReference, hashIpAddress, sha256 } from '../../common/utils/crypto.js';
import { MailService } from '../../mail/mail.service.js';
import {
  buildEnquiryConfirmationEmail,
  buildEnquiryNotificationEmail,
} from '../../mail/templates/enquiry.templates.js';
import { AuditService } from '../audit/audit.service.js';

import type { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import type {
  CreateEnquiryNoteDto,
  EnquiryExportQueryDto,
  EnquiryListQueryDto,
  UpdateEnquiryDto,
} from './dto/enquiry-admin.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { ClientContext } from '../../common/decorators/index.js';

/**
 * Window within which an identical submission is treated as an accidental
 * double-send rather than a new enquiry. Ten minutes is long enough to cover a
 * double click or a browser back-and-resubmit, short enough that a genuine
 * follow-up the same day is still recorded.
 */
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export const ENQUIRY_CONFIRMATION_MESSAGE =
  'Thank you for reaching out to InkVision Creatives. Your enquiry has been received. We will review the details and respond using the contact information you provided.';

@Injectable()
export class EnquiriesService {
  private readonly logger = new Logger(EnquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Records a public enquiry.
   *
   * Order of operations matters: the enquiry is persisted first and email is
   * sent afterwards, best-effort. A mail outage must never cost the business a
   * lead or show the visitor an error for something that did succeed.
   */
  async create(dto: CreateEnquiryDto, client: ClientContext): Promise<CreateEnquiryResponse> {
    // The honeypot is checked server-side and answered with the ordinary
    // success response: a bot learns nothing, and nothing is stored.
    if (dto.website && dto.website.trim().length > 0) {
      this.logger.warn({ ip: 'redacted' }, 'Enquiry rejected: honeypot field was filled');
      return {
        received: true,
        reference: generateReference('ENQ'),
        message: ENQUIRY_CONFIRMATION_MESSAGE,
        duplicate: false,
      };
    }

    const dedupeHash = sha256(
      [dto.workEmail, dto.serviceInterest, dto.message.replace(/\s+/g, ' ').trim()].join('|'),
    );

    const recent = await this.prisma.enquiry.findFirst({
      where: { dedupeHash, createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) } },
      select: { reference: true },
    });

    if (recent) {
      // Reported as success with the original reference: from the visitor's
      // point of view their enquiry has been received, which is true.
      return {
        received: true,
        reference: recent.reference,
        message: ENQUIRY_CONFIRMATION_MESSAGE,
        duplicate: true,
      };
    }

    const enquiry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enquiry.create({
        data: {
          reference: generateReference('ENQ'),
          fullName: dto.fullName,
          workEmail: dto.workEmail,
          organisationOrRole: dto.organisationOrRole ?? null,
          serviceInterest: dto.serviceInterest,
          message: dto.message,
          timeline: dto.timeline,
          budgetRange: dto.budgetRange ?? null,
          referralSource: dto.referralSource ?? null,
          consentAt: new Date(),
          dedupeHash,
          ipHash: hashIpAddress(client.ipAddress, this.config.auth.csrfSecret),
          userAgent: client.userAgent ?? null,
          status: 'NEW',
        },
      });

      // The initial status is part of the history, so the trail is complete
      // from the first moment rather than starting at the first edit.
      await tx.enquiryStatusChange.create({
        data: { enquiryId: created.id, fromStatus: null, toStatus: 'NEW' },
      });

      return created;
    });

    await this.dispatchEnquiryEmails(enquiry);

    return {
      received: true,
      reference: enquiry.reference,
      message: ENQUIRY_CONFIRMATION_MESSAGE,
      duplicate: false,
    };
  }

  private async dispatchEnquiryEmails(enquiry: {
    id: string;
    reference: string;
    fullName: string;
    workEmail: string;
    organisationOrRole: string | null;
    serviceInterest: CreateEnquiryDto['serviceInterest'];
    timeline: CreateEnquiryDto['timeline'];
    budgetRange: string | null;
    referralSource: string | null;
    message: string;
  }): Promise<void> {
    const context = {
      reference: enquiry.reference,
      fullName: enquiry.fullName,
      workEmail: enquiry.workEmail,
      organisationOrRole: enquiry.organisationOrRole,
      serviceInterest: enquiry.serviceInterest,
      timeline: enquiry.timeline,
      budgetRange: enquiry.budgetRange,
      referralSource: enquiry.referralSource,
      message: enquiry.message,
      adminUrl: `${this.config.publicWebUrl}/admin/enquiries/${enquiry.id}`,
      siteName: 'InkVision Creatives',
    };

    const recipient = this.mail.notificationRecipient;
    if (recipient) {
      await this.mail.trySend(buildEnquiryNotificationEmail(recipient, context));
    } else {
      this.logger.warn(
        { reference: enquiry.reference },
        'EMAIL_NOTIFICATIONS_TO is not configured: no notification was sent for this enquiry',
      );
    }

    await this.mail.trySend(buildEnquiryConfirmationEmail(context));
  }

  // ---------------------------------------------------------------------------
  // Admin reads
  // ---------------------------------------------------------------------------

  async list(query: EnquiryListQueryDto): Promise<Paginated<EnquirySummaryDto>> {
    const pagination = resolvePagination(query);
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.enquiry.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, fullName: true } },
          _count: { select: { notes: true } },
        },
        orderBy: { [query.sort ?? 'createdAt']: query.direction ?? 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.enquiry.count({ where }),
    ]);

    return paginate(rows.map(toSummary), total, pagination);
  }

  async findById(id: string): Promise<EnquiryDto> {
    const row = await this.prisma.enquiry.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        _count: { select: { notes: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, fullName: true } } },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!row) throw new ResourceNotFoundException('Enquiry', id);

    return {
      ...toSummary(row),
      message: row.message,
      budgetRange: row.budgetRange,
      referralSource: row.referralSource,
      consentAt: row.consentAt.toISOString(),
      notes: row.notes.map((note) => ({
        id: note.id,
        body: note.body,
        authorId: note.authorId,
        authorName: note.author.fullName,
        createdAt: note.createdAt.toISOString(),
      })),
      statusHistory: row.statusHistory.map((change) => ({
        id: change.id,
        fromStatus: change.fromStatus,
        toStatus: change.toStatus,
        changedById: change.changedById,
        changedByName: change.changedBy?.fullName ?? null,
        reason: change.reason,
        createdAt: change.createdAt.toISOString(),
      })),
    };
  }

  async countsByStatus(from?: Date, to?: Date): Promise<Record<EnquiryStatus, number>> {
    const grouped = await this.prisma.enquiry.groupBy({
      by: ['status'],
      _count: { _all: true },
      ...(from || to
        ? { where: { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } }
        : {}),
    });

    const result: Record<EnquiryStatus, number> = {
      NEW: 0,
      REVIEWING: 0,
      QUALIFIED: 0,
      IN_DISCUSSION: 0,
      CONVERTED: 0,
      CLOSED: 0,
    };

    for (const row of grouped) {
      result[row.status] = row._count._all;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Admin writes
  // ---------------------------------------------------------------------------

  /**
   * Updates status, assignment and follow-up date.
   *
   * A status change writes its own history row in the same transaction as the
   * update, so the trail can never diverge from the current state.
   */
  async update(id: string, dto: UpdateEnquiryDto, actor: AuthenticatedUser): Promise<EnquiryDto> {
    const existing = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!existing) throw new ResourceNotFoundException('Enquiry', id);

    if (dto.assignedToId) {
      const assignee = await this.prisma.adminUser.findUnique({
        where: { id: dto.assignedToId },
        select: { id: true, isActive: true },
      });
      if (!assignee?.isActive) {
        throw new ValidationFailedException({
          assignedToId: ['That team member does not exist or is no longer active.'],
        });
      }
    }

    const statusChanged = dto.status !== undefined && dto.status !== existing.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.enquiry.update({
        where: { id },
        data: {
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.assignedToId !== undefined ? { assignedToId: dto.assignedToId } : {}),
          ...(dto.followUpAt !== undefined
            ? { followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null }
            : {}),
        },
      });

      if (statusChanged) {
        await tx.enquiryStatusChange.create({
          data: {
            enquiryId: id,
            fromStatus: existing.status,
            toStatus: dto.status!,
            changedById: actor.id,
            reason: dto.statusReason ?? null,
          },
        });
      }
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: statusChanged ? 'enquiry.status_changed' : 'enquiry.updated',
      entityType: 'Enquiry',
      entityId: id,
      summary: statusChanged
        ? `Enquiry ${existing.reference}: ${existing.status} → ${dto.status}`
        : `Updated enquiry ${existing.reference}`,
      metadata: { changedFields: Object.keys(dto) },
    });

    return this.findById(id);
  }

  async addNote(
    id: string,
    dto: CreateEnquiryNoteDto,
    actor: AuthenticatedUser,
  ): Promise<EnquiryDto> {
    const existing = await this.prisma.enquiry.findUnique({
      where: { id },
      select: { id: true, reference: true },
    });
    if (!existing) throw new ResourceNotFoundException('Enquiry', id);

    await this.prisma.enquiryNote.create({
      data: { enquiryId: id, authorId: actor.id, body: dto.body },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'enquiry.note_added',
      entityType: 'Enquiry',
      entityId: id,
      summary: `Added an internal note to enquiry ${existing.reference}`,
    });

    return this.findById(id);
  }

  /**
   * CSV export.
   *
   * Scoped to the same filters as the list view, capped, and audited — an export
   * moves personal data out of the system, so it is recorded as a deliberate
   * act with a named actor.
   */
  async exportCsv(query: EnquiryExportQueryDto, actor: AuthenticatedUser): Promise<string> {
    const rows = await this.prisma.enquiry.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.serviceInterest ? { serviceInterest: query.serviceInterest } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: { assignedTo: { select: { fullName: true } } },
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'enquiry.exported',
      entityType: 'Enquiry',
      summary: `${actor.email} exported ${rows.length} enquiries to CSV`,
      metadata: { rowCount: rows.length, filters: { ...query } },
    });

    const header = [
      'Reference',
      'Received (UTC)',
      'Name',
      'Email',
      'Organisation or role',
      'Service',
      'Timeline',
      'Budget',
      'Heard via',
      'Status',
      'Assigned to',
      'Message',
    ];

    const lines = rows.map((row) =>
      [
        row.reference,
        row.createdAt.toISOString(),
        row.fullName,
        row.workEmail,
        row.organisationOrRole ?? '',
        row.serviceInterest,
        row.timeline,
        row.budgetRange ?? '',
        row.referralSource ?? '',
        row.status,
        row.assignedTo?.fullName ?? '',
        row.message,
      ]
        .map(csvCell)
        .join(','),
    );

    return [header.map(csvCell).join(','), ...lines].join('\r\n');
  }

  private buildWhere(query: EnquiryListQueryDto) {
    const term = query.search?.trim().slice(0, 120);

    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceInterest ? { serviceInterest: query.serviceInterest } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(term
        ? {
            OR: [
              { fullName: { contains: term, mode: 'insensitive' as const } },
              { workEmail: { contains: term, mode: 'insensitive' as const } },
              { organisationOrRole: { contains: term, mode: 'insensitive' as const } },
              { reference: { contains: term.toUpperCase() } },
            ],
          }
        : {}),
    };
  }
}

function toSummary(row: {
  id: string;
  reference: string;
  fullName: string;
  workEmail: string;
  organisationOrRole: string | null;
  serviceInterest: EnquirySummaryDto['serviceInterest'];
  timeline: EnquirySummaryDto['timeline'];
  status: EnquiryStatus;
  assignedToId: string | null;
  assignedTo: { id: string; fullName: string } | null;
  followUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { notes: number };
}): EnquirySummaryDto {
  return {
    id: row.id,
    reference: row.reference,
    fullName: row.fullName,
    workEmail: row.workEmail,
    organisationOrRole: row.organisationOrRole,
    serviceInterest: row.serviceInterest,
    timeline: row.timeline,
    status: row.status,
    assignedToId: row.assignedToId,
    assignedToName: row.assignedTo?.fullName ?? null,
    followUpAt: row.followUpAt?.toISOString() ?? null,
    noteCount: row._count.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * RFC-4180 quoting, plus a leading apostrophe for values a spreadsheet would
 * otherwise evaluate as a formula. Without it, an exported field beginning
 * `=`, `+`, `-` or `@` becomes a CSV-injection vector in Excel.
 */
function csvCell(value: string): string {
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const guarded = needsFormulaGuard ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}
